-- Online Test Management System - Seed Data
USE `ots_db`;

-- 1. Seed Admin
-- Credentials: Username=admin / Password=Admin@123
INSERT INTO `admins` (`id`, `username`, `email`, `password`) VALUES
(1, 'admin', 'admin@college.edu', '$2b$10$/YSjUb1Fo0eCxVE9P0Z3Eu92htZDEUm8ousYoOSoDxmqOG1aqGP.u');

-- 2. Seed Students
-- Credentials: Password=Student@123
INSERT INTO `students` (`id`, `student_id`, `name`, `email`, `password`, `status`) VALUES
(1, 'STU001', 'Alice Johnson', 'alice@college.edu', '$2b$10$WwsH5OLWgcR2hodH6bMDkOhwZ3rFAteRJxQfaGFjmgK.qr6lzIX0u', 'ACTIVE'),
(2, 'STU002', 'Bob Smith', 'bob@college.edu', '$2b$10$WwsH5OLWgcR2hodH6bMDkOhwZ3rFAteRJxQfaGFjmgK.qr6lzIX0u', 'ACTIVE'),
(3, 'STU003', 'Charlie Brown', 'charlie@college.edu', '$2b$10$WwsH5OLWgcR2hodH6bMDkOhwZ3rFAteRJxQfaGFjmgK.qr6lzIX0u', 'ACTIVE');

-- 3. Seed Subjects
INSERT INTO `subjects` (`id`, `name`, `code`, `description`) VALUES
(1, 'Database Management Systems', 'CS301', 'Relational database concepts, SQL, normal forms, transaction management, and indexing.'),
(2, 'Computer Networks', 'CS302', 'OSI model, TCP/IP protocol suite, network layers, routing, and network security.'),
(3, 'Operating Systems', 'CS303', 'Processes, CPU scheduling, synchronization, deadlocks, and memory management.');

-- 4. Seed Questions & Options for DBMS (Subject ID 1) - 30 Questions
-- Question 1
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(1, 1, 'What does DBMS stand for?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(1, 'Data Backup and Management System', 0),
(1, 'Database Management System', 1),
(1, 'Database Memory System', 0),
(1, 'Digital Binary Management System', 0);

-- Question 2
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(2, 1, 'Which of the following is an example of a Data Definition Language (DDL) command?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(2, 'SELECT', 0),
(2, 'INSERT', 0),
(2, 'CREATE', 1),
(2, 'UPDATE', 0);

-- Question 3
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(3, 1, 'In a relational database, what is a primary key?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(3, 'A key that can accept duplicate and null values', 0),
(3, 'An attribute that uniquely identifies each row in a table', 1),
(3, 'A key used only for encryption purposes', 0),
(3, 'An attribute that links to another table without uniqueness', 0);

-- Question 4
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(4, 1, 'Which normal form eliminates partial dependency on a composite primary key?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(4, 'First Normal Form (1NF)', 0),
(4, 'Second Normal Form (2NF)', 1),
(4, 'Third Normal Form (3NF)', 0),
(4, 'Boyce-Codd Normal Form (BCNF)', 0);

-- Question 5
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(5, 1, 'Which normal form eliminates transitive functional dependencies?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(5, 'First Normal Form (1NF)', 0),
(5, 'Second Normal Form (2NF)', 0),
(5, 'Third Normal Form (3NF)', 1),
(5, 'Fourth Normal Form (4NF)', 0);

-- Question 6
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(6, 1, 'What does the ACID acronym stand for in database transactions?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(6, 'Atomicity, Consistency, Isolation, Durability', 1),
(6, 'Accuracy, Consistency, Integrity, Durability', 0),
(6, 'Atomicity, Concurrency, Isolation, Dependability', 0),
(6, 'Availability, Consistency, Integrity, Durability', 0);

-- Question 7
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(7, 1, 'Which SQL clause is used to filter records based on group aggregate conditions?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(7, 'WHERE', 0),
(7, 'HAVING', 1),
(7, 'ORDER BY', 0),
(7, 'GROUP BY', 0);

-- Question 8
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(8, 1, 'What is a foreign key in SQL?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(8, 'A key that must always be primary in its own table', 0),
(8, 'A field in one table that uniquely identifies a row of another table', 1),
(8, 'A key generated randomly by the database server', 0),
(8, 'A unique index created only on string columns', 0);

-- Question 9
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(9, 1, 'Which SQL command is used to permanently remove all rows from a table without logging individual row deletions?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(9, 'DELETE', 0),
(9, 'TRUNCATE', 1),
(9, 'DROP', 0),
(9, 'REMOVE', 0);

-- Question 10
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(10, 1, 'What is the function of the COMMIT command in a transaction?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(10, 'Undoes changes made during current transaction', 0),
(10, 'Permanently saves all transaction changes to the database', 1),
(10, 'Pauses the transaction execution', 0),
(10, 'Rolls back to the previous savepoint', 0);

-- Question 11
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(11, 1, 'Which SQL keyword is used to eliminate duplicate values from a query result?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(11, 'UNIQUE', 0),
(11, 'DISTINCT', 1),
(11, 'DIFFERENT', 0),
(11, 'FILTER', 0);

-- Question 12
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(12, 1, 'In an Entity-Relationship (ER) diagram, what shape represents an Entity?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(12, 'Ellipse', 0),
(12, 'Diamond', 0),
(12, 'Rectangle', 1),
(12, 'Triangle', 0);

-- Question 13
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(13, 1, 'In an ER diagram, what shape represents a Relationship between entities?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(13, 'Diamond', 1),
(13, 'Rectangle', 0),
(13, 'Circle', 0),
(13, 'Hexagon', 0);

-- Question 14
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(14, 1, 'Which JOIN returns all rows from the left table and matched rows from the right table?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(14, 'INNER JOIN', 0),
(14, 'LEFT JOIN', 1),
(14, 'RIGHT JOIN', 0),
(14, 'CROSS JOIN', 0);

-- Question 15
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(15, 1, 'What data structure is most commonly used for database index implementations?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(15, 'Linked List', 0),
(15, 'B+ Tree', 1),
(15, 'Stack', 0),
(15, 'Queue', 0);

-- Question 16
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(16, 1, 'What does the term "Cardinality" represent in relational data modeling?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(16, 'The total number of columns in a table', 0),
(16, 'The total number of rows (tuples) in a table', 1),
(16, 'The data type of a column', 0),
(16, 'The number of primary keys defined', 0);

-- Question 17
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(17, 1, 'What does the term "Degree" of a relation refer to?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(17, 'The number of rows in the relation', 0),
(17, 'The number of attributes (columns) in the relation', 1),
(17, 'The size in megabytes of the table', 0),
(17, 'The number of foreign keys in the relation', 0);

-- Question 18
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(18, 1, 'Which SQL constraint ensures that all values in a column are different?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(18, 'CHECK', 0),
(18, 'UNIQUE', 1),
(18, 'NOT NULL', 0),
(18, 'DEFAULT', 0);

-- Question 19
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(19, 1, 'Which command is categorized as a Data Manipulation Language (DML) command?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(19, 'ALTER', 0),
(19, 'UPDATE', 1),
(19, 'DROP', 0),
(19, 'GRANT', 0);

-- Question 20
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(20, 1, 'What is the purpose of the ROLLBACK command in SQL?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(20, 'Saves all transactions permanently', 0),
(20, 'Restores the database state to the beginning of the transaction or savepoint', 1),
(20, 'Deletes the database schema', 0),
(20, 'Reboots the MySQL server', 0);

-- Question 21
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(21, 1, 'Which aggregate function is used to calculate the average value in a numeric column?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(21, 'MEAN()', 0),
(21, 'AVG()', 1),
(21, 'AVERAGE()', 0),
(21, 'SUM()', 0);

-- Question 22
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(22, 1, 'What is a View in SQL?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(22, 'A physical table stored with separate storage space', 0),
(22, 'A virtual table based on the result-set of an SQL statement', 1),
(22, 'A temporary index used during sort operations', 0),
(22, 'A backup file of the entire database', 0);

-- Question 23
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(23, 1, 'Which level of database architecture describes how data is actually stored on physical hardware?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(23, 'External Level', 0),
(23, 'Conceptual Level', 0),
(23, 'Internal (Physical) Level', 1),
(23, 'View Level', 0);

-- Question 24
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(24, 1, 'What is data redundancy in database systems?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(24, 'Storage of the same piece of data in multiple places unnecessarily', 1),
(24, 'Corrupted data after system crash', 0),
(24, 'Fast retrieval of indexed records', 0),
(24, 'Secure encryption of student passwords', 0);

-- Question 25
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(25, 1, 'Which SQL wildcard character represents zero or more characters in a LIKE clause?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(25, '_', 0),
(25, '%', 1),
(25, '*', 0),
(25, '?', 0);

-- Question 26
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(26, 1, 'Which concurrency anomaly occurs when one transaction reads uncommitted changes from another transaction?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(26, 'Non-repeatable read', 0),
(26, 'Dirty Read', 1),
(26, 'Phantom Read', 0),
(26, 'Lost Update', 0);

-- Question 27
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(27, 1, 'What is the main purpose of Database Normalization?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(27, 'To maximize disk storage usage', 0),
(27, 'To reduce data redundancy and improve data integrity', 1),
(27, 'To combine all database tables into a single giant table', 0),
(27, 'To disable all foreign key constraints', 0);

-- Question 28
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(28, 1, 'Which property ensures that concurrent execution of transactions leaves the database in the same state as if executed serially?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(28, 'Atomicity', 0),
(28, 'Isolation', 1),
(28, 'Durability', 0),
(28, 'Scalability', 0);

-- Question 29
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(29, 1, 'Which command is used to grant privileges to a database user?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(29, 'GIVE', 0),
(29, 'GRANT', 1),
(29, 'ALLOW', 0),
(29, 'ASSIGN', 0);

-- Question 30
INSERT INTO `questions` (`id`, `subject_id`, `question_text`, `marks`) VALUES
(30, 1, 'What type of dependency is addressed by Boyce-Codd Normal Form (BCNF)?', 1.00);
INSERT INTO `options` (`question_id`, `option_text`, `is_correct`) VALUES
(30, 'Partial dependency', 0),
(30, 'Functional dependency where determinant is not a super key', 1),
(30, 'Multivalued dependency', 0),
(30, 'Join dependency', 0);

-- 5. Seed Tests
INSERT INTO `tests` (`id`, `subject_id`, `title`, `description`, `duration_minutes`, `total_questions`, `total_marks`, `max_violations`, `status`) VALUES
(1, 1, 'DBMS Mid-Term Assessment', 'Covers relational model, SQL queries, normalization, transactions, and indexing.', 10, 5, 5.00, 3, 'ACTIVE'),
(2, 2, 'Computer Networks Practice Test', 'Covers OSI layers, TCP/IP, IP addressing, and routing basics.', 15, 5, 5.00, 3, 'INACTIVE');
