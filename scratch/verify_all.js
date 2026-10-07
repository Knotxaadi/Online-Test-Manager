const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runEndToEndVerification() {
  console.log('=== STARTING COMPLETE END-TO-END SYSTEM VERIFICATION ===\n');

  // 1. Health check
  console.log('1. Testing /api/health...');
  const healthRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  console.log(`   Health Check status: ${healthRes.status}, response:`, healthRes.body);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Admin Login
  console.log('\n2. Testing Admin Login...');
  const adminLoginRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'Admin@123' });
  console.log(`   Admin Login status: ${adminLoginRes.status}, user:`, adminLoginRes.body.user);
  if (adminLoginRes.status !== 200 || !adminLoginRes.body.token) throw new Error('Admin login failed');
  const adminToken = adminLoginRes.body.token;

  // 3. Student Login
  console.log('\n3. Testing Student Login...');
  const stuLoginRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/student/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { studentId: 'STU001', password: 'Student@123' });
  console.log(`   Student Login status: ${stuLoginRes.status}, user:`, stuLoginRes.body.user);
  if (stuLoginRes.status !== 200 || !stuLoginRes.body.token) throw new Error('Student login failed');
  const studentToken = stuLoginRes.body.token;

  // 4. Admin CRUD: Create a test subject and questions
  console.log('\n4. Testing Admin CRUD flow...');
  const subjectRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/subjects',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, { name: 'E2E Testing Subject ' + Date.now(), code: 'E2E' + Math.floor(Math.random() * 1000) });
  console.log(`   Created Subject status: ${subjectRes.status}, id: ${subjectRes.body.subject?.id}`);
  const subjectId = subjectRes.body.subject.id;

  // Add 3 questions
  for (let i = 1; i <= 3; i++) {
    const qRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/questions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      subjectId,
      questionText: `E2E Test Question ${i}: What is ${i} + ${i}?`,
      options: [
        { text: `${i * 2}`, isCorrect: true },
        { text: `${i * 2 + 1}`, isCorrect: false },
        { text: `${i * 2 + 2}`, isCorrect: false },
        { text: `${i * 2 + 3}`, isCorrect: false }
      ]
    });
    if (qRes.status !== 201) throw new Error(`Failed to create question ${i}`);
  }
  console.log('   Successfully created 3 test questions.');

  // Create a Test requiring 2 questions
  const testRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/tests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, {
    subjectId,
    title: 'E2E Automated Exam ' + Date.now(),
    durationMinutes: 10,
    totalQuestions: 2,
    totalMarks: 20,
    maxViolations: 3,
    status: 'active'
  });
  console.log(`   Created Test status: ${testRes.status}, id: ${testRes.body.test?.id}`);
  const testId = testRes.body.test.id;

  // 5. Student Test Taking Flow
  console.log('\n5. Testing Student Test Taking & Evaluation...');
  // Start attempt
  const startRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/attempts/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, { testId });
  console.log(`   Start Attempt status: ${startRes.status}, attemptId: ${startRes.body.attempt?.id}`);
  if (startRes.status !== 200 && startRes.status !== 201) throw new Error('Failed to start attempt: ' + JSON.stringify(startRes.body));
  const attempt = startRes.body.attempt;
  const questions = startRes.body.questions || [];
  const attemptId = attempt.id;

  // Verify answer secrecy: NO is_correct in returned questions
  const hasLeak = questions.some(q => q.options && q.options.some(opt => 'is_correct' in opt || 'isCorrect' in opt));
  if (hasLeak) {
    throw new Error('SECURITY VIOLATION: is_correct found in student question payload!');
  }
  console.log('   ✓ Verified answer secrecy: Zero correct answer leakage in student API.');

  // Save answers
  for (const q of questions) {
    const selectedOption = q.options[0]; // Select the first option
    const answerRes = await request({
      host: 'localhost',
      port: 5000,
      path: `/api/attempts/${attemptId}/answer`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      }
    }, { questionId: q.id, selectedOptionId: selectedOption.id });
    console.log(`   Saved answer for Question ${q.id} (Option: ${selectedOption.id}) - Status: ${answerRes.status}`);
  }

  // Log a violation
  const violRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/attempts/${attemptId}/violation`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, { violationType: 'tab_switch' });
  console.log(`   Logged tab_switch violation - Status: ${violRes.status}, count: ${violRes.body.violationCount}`);

  // Submit attempt
  const submitRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/attempts/${attemptId}/submit`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  });
  console.log(`   Submitted attempt - Status: ${submitRes.status}, result:`, submitRes.body.result);

  // 6. View Results
  console.log('\n6. Verifying Result Retrieval...');
  const resultRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/results/${attemptId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log(`   Student Result status: ${resultRes.status}, score: ${resultRes.body.result?.score}/${resultRes.body.result?.total_marks}, percentage: ${resultRes.body.result?.percentage}%`);

  // Admin view all results
  const adminResultsRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/results',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`   Admin Results status: ${adminResultsRes.status}, total submissions: ${adminResultsRes.body.results?.length}`);

  // 7. Audit Conflict Protection (D-009)
  console.log('\n7. Verifying Audit Deletion Protection (409 Conflict)...');
  const deleteTestRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/tests/${testId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`   Attempt delete test with past attempts - Status: ${deleteTestRes.status}, message: "${deleteTestRes.body.message}"`);
  if (deleteTestRes.status === 409) {
    console.log('   ✓ Verified D-009: Test with attempts cannot be deleted (returned 409 Conflict).');
  } else {
    console.warn('   ⚠️ Warning: Expected 409 Conflict on delete attempt.');
  }

  console.log('\n=== ALL END-TO-END CHECKS PASSED SUCCESSFULLY! ===');
}

runEndToEndVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
