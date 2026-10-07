/**
 * CSV Helper Utilities for parsing, generating, and downloading CSV files.
 */

/**
 * Parse standard CSV string into array of row objects
 */
export function parseCSV(csvText) {
  const lines = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // ignore CR
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push last field & row if present
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length < 2) {
    return [];
  }

  // Normalize header keys: convert to lower_snake or lower camel
  const rawHeaders = lines[0];
  const headers = rawHeaders.map(h =>
    h.toLowerCase().replace(/[\s\-_]+/g, '_').replace(/[^a-z0-9_]/g, '')
  );

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] !== undefined ? row[j] : '';
    }
    data.push(obj);
  }

  return data;
}

/**
 * Convert array of objects to CSV text string and trigger browser download
 */
export function downloadCSV(filename, data, headers = null) {
  if (!Array.isArray(data) || data.length === 0) {
    alert('No data to export.');
    return;
  }

  const keys = headers || Object.keys(data[0]);
  const headerRow = keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(',');

  const rows = data.map(item => {
    return keys.map(k => {
      const val = item[k] !== undefined && item[k] !== null ? String(item[k]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sample CSV Templates
 */
export const SAMPLE_STUDENTS_CSV = `student_id,name,email,password,status
STU101,Johnathan Doe,john.doe@college.edu,Student@123,ACTIVE
STU102,Jane Smith,jane.smith@college.edu,Student@123,ACTIVE
STU103,David Miller,david.m@college.edu,Student@123,ACTIVE`;

export const SAMPLE_QUESTIONS_CSV = `question_text,option_a,option_b,option_c,option_d,correct_option,marks
What does SQL stand for?,Structured Query Language,Simple Query Logic,Standard Question List,Sequential Query Language,A,1
Which SQL command is used to remove a table?,DELETE,REMOVE,DROP,TRUNCATE,C,1
Which constraint uniquely identifies each record in a table?,FOREIGN KEY,PRIMARY KEY,UNIQUE KEY,CHECK,B,1`;

export function downloadSampleStudentsTemplate() {
  const blob = new Blob([SAMPLE_STUDENTS_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'students_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleQuestionsTemplate() {
  const blob = new Blob([SAMPLE_QUESTIONS_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'questions_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
