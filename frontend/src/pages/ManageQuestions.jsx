import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { parseCSV, downloadCSV, downloadSampleQuestionsTemplate } from '../utils/csvHelper';

export default function ManageQuestions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSubjectId = searchParams.get('subjectId') || '';

  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(urlSubjectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // CSV Modal State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [parsedCsvData, setParsedCsvData] = useState([]);
  const [csvSubjectId, setCsvSubjectId] = useState('');
  const [replaceExistingQuestions, setReplaceExistingQuestions] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [processingCsv, setProcessingCsv] = useState(false);
  const fileInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    subjectId: '',
    questionText: '',
    marks: 1,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Single Question State
  const [deleteId, setDeleteId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Delete All Questions for Subject State
  const [showClearSubjectModal, setShowClearSubjectModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      const subjectsRes = await api.getSubjects();
      setSubjects(subjectsRes.subjects || []);
      const currentSubj = selectedSubjectId || urlSubjectId;
      const questionsRes = await api.getQuestions(currentSubj || undefined);
      setQuestions(questionsRes.questions || []);
      if (currentSubj) {
        setSelectedSubjectId(currentSubj);
      }
    } catch (err) {
      setError(err.message || 'Failed to load questions and subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectFilterChange = async (subjId) => {
    setSelectedSubjectId(subjId);
    if (subjId) {
      setSearchParams({ subjectId: subjId });
    } else {
      setSearchParams({});
    }
    try {
      setLoading(true);
      setError('');
      const questionsRes = await api.getQuestions(subjId || undefined);
      setQuestions(questionsRes.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load questions for subject');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingQuestionId(null);
    setFormData({
      subjectId: selectedSubjectId || (subjects.length > 0 ? String(subjects[0].id) : ''),
      questionText: '',
      marks: 1,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (q) => {
    setModalMode('edit');
    setEditingQuestionId(q.id);

    const qOptions = q.options || [];
    const formattedOptions = (qOptions.length === 4)
      ? qOptions.map(opt => ({
          id: opt.id,
          text: opt.optionText || opt.option_text || opt.text || '',
          isCorrect: Boolean(opt.isCorrect !== undefined ? opt.isCorrect : opt.is_correct)
        }))
      : [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ];

    setFormData({
      subjectId: String(q.subjectId || q.subject_id || ''),
      questionText: q.questionText || q.question_text || '',
      marks: q.marks || 1,
      options: formattedOptions
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOptionTextChange = (index, text) => {
    const updated = [...formData.options];
    updated[index].text = text;
    setFormData({ ...formData, options: updated });
  };

  const handleCorrectOptionSelect = (index) => {
    const updated = formData.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setFormData({ ...formData, options: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.subjectId) {
      setFormError('Please select a subject');
      return;
    }
    if (!formData.questionText.trim()) {
      setFormError('Question text cannot be empty');
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (!formData.options[i].text.trim()) {
        setFormError(`Option ${String.fromCharCode(65 + i)} cannot be empty`);
        return;
      }
    }
    const correctCount = formData.options.filter(o => o.isCorrect).length;
    if (correctCount !== 1) {
      setFormError('Exactly one option must be marked as correct');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        subjectId: Number(formData.subjectId),
        questionText: formData.questionText.trim(),
        marks: Number(formData.marks) || 1,
        options: formData.options.map(o => ({
          id: o.id,
          text: o.text.trim(),
          optionText: o.text.trim(),
          isCorrect: o.isCorrect
        }))
      };

      if (modalMode === 'create') {
        await api.createQuestion(payload);
        setSuccess('Question added successfully!');
      } else {
        await api.updateQuestion(editingQuestionId, payload);
        setSuccess('Question updated successfully!');
      }

      setShowModal(false);
      handleSubjectFilterChange(selectedSubjectId);
    } catch (err) {
      setFormError(err.message || 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setError('');
      setSuccess('');
      await api.deleteQuestion(deleteId);
      setSuccess('Question deleted successfully!');
      setDeleteConfirmOpen(false);
      setDeleteId(null);
      handleSubjectFilterChange(selectedSubjectId);
    } catch (err) {
      setError(err.message || 'Failed to delete question');
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  // CSV Upload Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setCsvError('The CSV file has no valid data rows.');
          setParsedCsvData([]);
          return;
        }
        setParsedCsvData(parsed);
      } catch (err) {
        setCsvError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvSubmit = async () => {
    if (!csvSubjectId) {
      setCsvError('Please select a target subject for these questions.');
      return;
    }
    if (parsedCsvData.length === 0) {
      setCsvError('Please select a valid CSV file.');
      return;
    }

    setProcessingCsv(true);
    setCsvError('');

    try {
      const res = await api.bulkUploadQuestions({
        subjectId: Number(csvSubjectId),
        questions: parsedCsvData,
        replaceExisting: replaceExistingQuestions
      });

      setSuccess(res.message || 'Questions uploaded successfully!');
      setShowCsvModal(false);
      setCsvFile(null);
      setParsedCsvData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedSubjectId(csvSubjectId);
      handleSubjectFilterChange(csvSubjectId);
    } catch (err) {
      setCsvError(err.message || 'Bulk upload failed');
    } finally {
      setProcessingCsv(false);
    }
  };

  const handleClearSubjectQuestions = async () => {
    if (!selectedSubjectId) return;
    try {
      setError('');
      setSuccess('');
      const res = await api.deleteQuestionsBySubject(selectedSubjectId);
      setSuccess(res.message || 'All questions for this subject were cleared.');
      setShowClearSubjectModal(false);
      handleSubjectFilterChange(selectedSubjectId);
    } catch (err) {
      setError(err.message || 'Failed to clear subject questions');
      setShowClearSubjectModal(false);
    }
  };

  const handleExportQuestions = () => {
    if (questions.length === 0) {
      alert('No questions to export.');
      return;
    }

    const exportRows = questions.map((q) => {
      const qOpts = q.options || [];
      const optA = qOpts[0]?.optionText || qOpts[0]?.text || '';
      const optB = qOpts[1]?.optionText || qOpts[1]?.text || '';
      const optC = qOpts[2]?.optionText || qOpts[2]?.text || '';
      const optD = qOpts[3]?.optionText || qOpts[3]?.text || '';
      const correctIdx = qOpts.findIndex(o => o.isCorrect || o.is_correct);
      const correctLetter = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : 'A';

      return {
        question_text: q.questionText || q.question_text || '',
        option_a: optA,
        option_b: optB,
        option_c: optC,
        option_d: optD,
        correct_option: correctLetter,
        marks: q.marks || 1
      };
    });

    const subjectName = subjects.find(s => String(s.id) === String(selectedSubjectId))?.code || 'all_subjects';
    downloadCSV(`questions_${subjectName}.csv`, exportRows);
  };

  const filteredQuestions = questions.filter(q => {
    const text = (q.questionText || q.question_text || '').toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const selectedSubjectObj = subjects.find(s => String(s.id) === String(selectedSubjectId));

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <main className="admin-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Question Bank</h1>
              <p style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Manage multiple-choice questions (MCQs), CSV question import/export per subject, and answer keys.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setCsvSubjectId(selectedSubjectId || (subjects.length > 0 ? String(subjects[0].id) : ''));
                  setCsvFile(null);
                  setParsedCsvData([]);
                  setCsvError('');
                  setShowCsvModal(true);
                }}
                className="btn btn-secondary"
                style={{ gap: '0.4rem' }}
              >
                📥 Import CSV
              </button>
              <button
                onClick={handleExportQuestions}
                className="btn btn-outline"
                style={{ gap: '0.4rem' }}
              >
                📤 Export CSV
              </button>
              <button className="btn btn-primary" onClick={openCreateModal}>
                + Add Question
              </button>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

          {/* Filters Bar */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="🔍 Search questions by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ width: '280px' }}>
                <select
                  className="input"
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectFilterChange(e.target.value)}
                >
                  <option value="">All Subjects ({subjects.length} available)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedSubjectId && (
                <button
                  onClick={() => setShowClearSubjectModal(true)}
                  className="btn btn-danger"
                  style={{ height: '38px', fontSize: '0.85rem' }}
                  title="Clear all questions for selected subject"
                >
                  🗑️ Clear Subject Questions
                </button>
              )}
            </div>
          </div>

          {/* Questions List */}
          {loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Loading question bank...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              {searchQuery ? 'No questions match your search.' : 'No questions found for this subject. Click "+ Add Question" or "📥 Import CSV" to upload questions.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                Showing {filteredQuestions.length} questions {selectedSubjectObj ? `for ${selectedSubjectObj.name} (${selectedSubjectObj.code})` : ''}:
              </div>
              {filteredQuestions.map((q, idx) => {
                const subjectObj = subjects.find(s => String(s.id) === String(q.subjectId || q.subject_id));
                const qText = q.questionText || q.question_text || '';
                const qOptions = q.options || [];

                return (
                  <div key={q.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem' }}>Q{idx + 1}.</span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            color: '#1e40af',
                            fontWeight: 600
                          }}
                        >
                          {q.subjectName || (subjectObj ? subjectObj.name : `Subject #${q.subjectId || q.subject_id}`)}
                          {q.subjectCode ? ` (${q.subjectCode})` : ''}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          [{q.marks || 1} mark]
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
                          onClick={() => openEditModal(q)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
                          onClick={() => {
                            setDeleteId(q.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '1.025rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                      {qText}
                    </div>

                    {/* Options Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                      {qOptions.map((opt, oIdx) => {
                        const isCorrect = Boolean(opt.isCorrect !== undefined ? opt.isCorrect : opt.is_correct);
                        const optText = opt.optionText || opt.option_text || opt.text || '';
                        return (
                          <div
                            key={opt.id || oIdx}
                            style={{
                              padding: '0.625rem 0.875rem',
                              borderRadius: 'var(--radius-sm)',
                              border: isCorrect ? '1.5px solid #10b981' : '1px solid var(--color-border)',
                              background: isCorrect ? '#f0fdf4' : 'var(--color-bg-alt)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span style={{ fontSize: '0.875rem' }}>
                              <strong style={{ marginRight: '0.35rem', color: isCorrect ? '#047857' : 'var(--color-text)' }}>
                                {String.fromCharCode(65 + oIdx)}.
                              </strong>
                              {optText}
                            </span>
                            {isCorrect && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* CSV Bulk Upload Modal */}
      {showCsvModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                📥 Import Questions CSV
              </h2>
              <button
                type="button"
                onClick={downloadSampleQuestionsTemplate}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', height: '30px' }}
              >
                📄 Download Template CSV
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Upload a <code>.csv</code> file with columns: <code>question_text</code>, <code>option_a</code>, <code>option_b</code>, <code>option_c</code>, <code>option_d</code>, <code>correct_option</code> (A/B/C/D), <code>marks</code>.
            </p>

            {csvError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{csvError}</div>}

            <div className="form-group">
              <label className="form-label">Target Subject for Questions</label>
              <select
                value={csvSubjectId}
                onChange={(e) => setCsvSubjectId(e.target.value)}
                className="input"
                required
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="input"
              />
            </div>

            {/* Import Mode Options */}
            <div style={{ margin: '1.25rem 0', padding: '1rem', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Subject Question Bank Behavior:</div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                <input
                  type="radio"
                  name="qImportMode"
                  checked={!replaceExistingQuestions}
                  onChange={() => setReplaceExistingQuestions(false)}
                  style={{ marginTop: '0.2rem' }}
                />
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>Append to Subject Bank</strong>: Adds new questions alongside existing questions for this subject.
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="qImportMode"
                  checked={replaceExistingQuestions}
                  onChange={() => setReplaceExistingQuestions(true)}
                  style={{ marginTop: '0.2rem' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>
                  <strong>Replace All Questions for this Subject</strong>: Deletes existing questions in SQL for this subject and replaces with the new CSV.
                </span>
              </label>
            </div>

            {/* Preview Table */}
            {parsedCsvData.length > 0 && (
              <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                  Preview: {parsedCsvData.length} questions parsed
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <table className="table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Option A</th>
                        <th>Option B</th>
                        <th>Option C</th>
                        <th>Option D</th>
                        <th>Ans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCsvData.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.question_text || row.question || row.questiontext || 'N/A'}
                          </td>
                          <td>{row.option_a || row.option1 || 'N/A'}</td>
                          <td>{row.option_b || row.option2 || 'N/A'}</td>
                          <td>{row.option_c || row.option3 || 'N/A'}</td>
                          <td>{row.option_d || row.option4 || 'N/A'}</td>
                          <td><strong style={{ color: 'var(--color-primary)' }}>{row.correct_option || row.answer || 'A'}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedCsvData.length > 5 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    + {parsedCsvData.length - 5} more rows...
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                disabled={processingCsv}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCsvSubmit}
                disabled={processingCsv || parsedCsvData.length === 0 || !csvSubjectId}
                className="btn btn-primary"
              >
                {processingCsv ? 'Uploading...' : replaceExistingQuestions ? 'Replace Subject Questions' : 'Upload Questions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Subject Questions Modal */}
      {showClearSubjectModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-danger)' }}>Clear All Subject Questions?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              Are you sure you want to delete all questions for subject <strong>{selectedSubjectObj?.name}</strong> from the database? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowClearSubjectModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleClearSubjectQuestions}
              >
                Confirm Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {modalMode === 'create' ? 'Add New Question' : 'Edit Question'}
            </h2>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select
                  className="input"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  required
                >
                  <option value="">Select a Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="Enter the question statement..."
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Marks</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="input"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Options & Correct Answer (Select the radio button for the correct choice)
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.5rem' }}>
                  {formData.options.map((opt, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: opt.isCorrect ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: opt.isCorrect ? 'var(--color-primary-light)' : 'var(--color-surface)'
                      }}
                    >
                      <input
                        type="radio"
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={() => handleCorrectOptionSelect(i)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <strong style={{ width: '20px', color: opt.isCorrect ? 'var(--color-primary)' : 'inherit' }}>
                        {String.fromCharCode(65 + i)}
                      </strong>
                      <input
                        type="text"
                        className="input"
                        placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(i, e.target.value)}
                        required
                        style={{ flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Save Question' : 'Update Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-danger)' }}>Delete Question?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              Are you sure you want to delete this question? Questions that have already been part of student exam attempts cannot be deleted to preserve academic records.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
