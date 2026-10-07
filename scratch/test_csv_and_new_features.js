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

async function testNewFeatures() {
  console.log('=== TESTING NEW CSV, SUBJECT & QUESTION BANK FEATURES ===\n');

  // 1. Admin login
  console.log('1. Logging in as Admin...');
  const adminLogin = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'Admin@123' });

  if (adminLogin.status !== 200 || !adminLogin.body.token) {
    throw new Error('Admin login failed');
  }
  const token = adminLogin.body.token;
  console.log('   ✓ Admin logged in successfully.');

  // 2. Test Bulk Student Upload (Append)
  console.log('\n2. Testing Bulk Student Upload (Append mode)...');
  const bulkStudentRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/students/bulk-upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    replaceExisting: false,
    students: [
      { student_id: 'CSV_STU_1', name: 'CSV Student One', email: 'csv1@college.edu', password: 'Student@123', status: 'ACTIVE' },
      { student_id: 'CSV_STU_2', name: 'CSV Student Two', email: 'csv2@college.edu', password: 'Student@123', status: 'ACTIVE' }
    ]
  });
  console.log('   Bulk upload append response status:', bulkStudentRes.status, bulkStudentRes.body);
  if (bulkStudentRes.status !== 200) throw new Error('Bulk student append failed');

  // 3. Create a test Subject for Question CSV testing
  console.log('\n3. Creating new Subject for Question CSV testing...');
  const subjRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/subjects',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    name: 'Operating Systems ' + Date.now(),
    code: 'OS_' + Math.floor(Math.random() * 1000),
    description: 'OS concepts and process management'
  });
  console.log('   Create subject status:', subjRes.status, 'id:', subjRes.body.subject?.id);
  const subjectId = subjRes.body.subject.id;

  // 4. Test Bulk Question Upload for this Subject
  console.log('\n4. Testing Bulk Question Upload for Subject ID:', subjectId);
  const bulkQRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/questions/bulk-upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    subjectId,
    replaceExisting: false,
    questions: [
      {
        question_text: 'What is a process in an operating system?',
        option_a: 'A program in execution',
        option_b: 'A passive entity on disk',
        option_c: 'A device driver',
        option_d: 'An interrupt handler',
        correct_option: 'A',
        marks: 1
      },
      {
        question_text: 'Which scheduling algorithm is non-preemptive?',
        option_a: 'Round Robin',
        option_b: 'First Come First Served (FCFS)',
        option_c: 'Shortest Remaining Time First',
        option_d: 'Priority Scheduling with preemption',
        correct_option: 'B',
        marks: 1
      },
      {
        question_text: 'Which system call is used to create a new process in Linux/Unix?',
        option_a: 'create()',
        option_b: 'exec()',
        option_c: 'fork()',
        option_d: 'spawn()',
        correct_option: 'C',
        marks: 1
      }
    ]
  });
  console.log('   Bulk Question upload status:', bulkQRes.status, bulkQRes.body);
  if (bulkQRes.status !== 200 || bulkQRes.body.insertedCount !== 3) {
    throw new Error('Bulk question upload failed');
  }

  // 5. Verify Questions retrieved for Subject
  console.log('\n5. Verifying Questions in Bank for Subject...');
  const getQRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/questions?subjectId=${subjectId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`   Retrieved ${getQRes.body.questions?.length} questions for subject.`);
  if (getQRes.body.questions?.length !== 3) throw new Error('Question retrieval count mismatch');

  // 6. Test Delete All Questions for Subject
  console.log('\n6. Testing Delete All Questions for Subject...');
  const deleteSubjQRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/questions/subject/${subjectId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('   Delete subject questions status:', deleteSubjQRes.status, deleteSubjQRes.body);
  if (deleteSubjQRes.status !== 200) throw new Error('Delete questions by subject failed');

  // Verify questions are gone for this subject
  const getQEmptyRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/questions?subjectId=${subjectId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`   After clear: ${getQEmptyRes.body.questions?.length} questions remaining.`);
  if (getQEmptyRes.body.questions?.length !== 0) throw new Error('Expected 0 questions after clear');

  console.log('\n=== ALL NEW CSV & SUBJECT/QUESTION BANK FEATURES PASSED! ===');
}

testNewFeatures().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
