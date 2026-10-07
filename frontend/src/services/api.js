/**
 * Central HTTP API Service for Online Test Management System
 * Handles base URL, auth token attachment, and unified error parsing.
 */

const API_BASE = '/api';

/**
 * Generic request helper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || 'Something went wrong');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      error.message = 'Could not reach server. Try again.';
    }
    throw error;
  }
}

export const api = {
  // Authentication
  loginAdmin: (credentials) => request('/auth/admin/login', { method: 'POST', body: credentials }),
  loginStudent: (credentials) => request('/auth/student/login', { method: 'POST', body: credentials }),
  getMe: () => request('/auth/me'),

  // Students (Admin)
  getStudents: () => request('/students'),
  getStudent: (id) => request(`/students/${id}`),
  createStudent: (data) => request('/students', { method: 'POST', body: data }),
  bulkUploadStudents: (data) => request('/students/bulk-upload', { method: 'POST', body: data }),
  updateStudent: (id, data) => request(`/students/${id}`, { method: 'PUT', body: data }),
  resetStudentPassword: (id, data) => request(`/students/${id}/reset-password`, { method: 'PUT', body: data }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),

  // Subjects (Admin / Student read)
  getSubjects: () => request('/subjects'),
  getSubject: (id) => request(`/subjects/${id}`),
  createSubject: (data) => request('/subjects', { method: 'POST', body: data }),
  updateSubject: (id, data) => request(`/subjects/${id}`, { method: 'PUT', body: data }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),

  // Tests (Admin / Student read)
  getTests: () => request('/tests'),
  getTest: (id) => request(`/tests/${id}`),
  createTest: (data) => request('/tests', { method: 'POST', body: data }),
  updateTest: (id, data) => request(`/tests/${id}`, { method: 'PUT', body: data }),
  updateTestStatus: (id, status) => request(`/tests/${id}/status`, { method: 'PUT', body: { status } }),
  deleteTest: (id) => request(`/tests/${id}`, { method: 'DELETE' }),

  // Questions (Admin)
  getQuestions: (subjectId) => request(`/questions${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getQuestion: (id) => request(`/questions/${id}`),
  createQuestion: (data) => request('/questions', { method: 'POST', body: data }),
  bulkUploadQuestions: (data) => request('/questions/bulk-upload', { method: 'POST', body: data }),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PUT', body: data }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),
  deleteQuestionsBySubject: (subjectId) => request(`/questions/subject/${subjectId}`, { method: 'DELETE' }),

  // Attempts (Student)
  startAttempt: (testId) => request('/attempts/start', { method: 'POST', body: { testId } }),
  getAttempt: (id) => request(`/attempts/${id}`),
  saveAnswer: (attemptId, questionId, selectedOptionId) =>
    request(`/attempts/${attemptId}/answer`, {
      method: 'PUT',
      body: { questionId, selectedOptionId }
    }),
  logViolation: (attemptId, violationType) =>
    request(`/attempts/${attemptId}/violation`, {
      method: 'POST',
      body: { violationType }
    }),
  submitAttempt: (attemptId) =>
    request(`/attempts/${attemptId}/submit`, { method: 'POST' }),

  // Results
  getResults: () => request('/results'),
  getResult: (attemptId) => request(`/results/${attemptId}`)
};

export default api;
