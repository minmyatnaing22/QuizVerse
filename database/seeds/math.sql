INSERT INTO questions
(chapter_id, question_number, question_text, question_type, difficulty, explanation)
VALUES
(
7,
1,
'The domain of \(y=\sin\frac{\pi}{2}x\) is',
'MCQ',
'Standard',
''
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type, difficulty, explanation)
VALUES
(
7,
2,
'If the restricted domain of \(y=\sin x\) is \(0\le x\le2\pi\), then the corresponding restricted domain of \(y=\sin\frac{\pi}{2}x\) is',
'MCQ',
'Standard',
''
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type, difficulty, explanation)
VALUES
(
7,
3,
'If the restricted domain of \(y=\cos x\) is \(0\le x\le\pi\), then the corresponding restricted domain of \(y=\cos\frac{\pi}{2}x\) is',
'MCQ',
'Standard',
''
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type, difficulty, explanation)
VALUES
(
7,
4,
'The maximum point of the graph of \(y=2\sin\frac{\pi}{3}x+5\) is',
'MCQ',
'Standard',
''
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type, difficulty, explanation)
VALUES
(
7,
5,
'The minimum point of the graph of \(y=2\cos\frac{\pi}{3}x+3\) is',
'MCQ',
'Standard',
''
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type, difficulty, explanation)
VALUES
(
7,
6,
'For the graph of \(y=3\sin2(x+1)+4\), the amplitude is',
'MCQ',
'Standard',
''
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type, difficulty, explanation)
VALUES
(
7,
7,
'For the graph of \(y=-2\cos\pi(x+1)+3\), the amplitude is',
'MCQ',
'Standard',
''
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type, difficulty, explanation)
VALUES
(
7,
8,
'The range of the function \(y=-2\sin\frac{\pi}{2}(x-3)+2\) is',
'MCQ',
'Standard',
''
);

INSERT INTO question_answers
(question_id, correct_answer)
VALUES
(1, 'B'),
(2, 'B'),
(3, 'D'),
(4, 'B'),
(5, 'C'),
(6, 'C'),
(7, 'B'),
(8, 'B');

============================================================================================

-- Question 1
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(1,'A','\([-1,1]\)'),
(1,'B','\(\mathbb{R}\)'),
(1,'C','\(\mathbb{R}\setminus\{0\}\)'),
(1,'D','\(\mathbb{R}\setminus\{1\}\)');

-- Question 2
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(2,'A','\(0\le x\le\pi\)'),
(2,'B','\(0\le x\le4\)'),
(2,'C','\(0\le x\le2\pi\)'),
(2,'D','\(0\le x\le2\)');

-- Question 3
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(3,'A','\(0\le x\le\pi\)'),
(3,'B','\(0\le x\le4\)'),
(3,'C','\(0\le x\le2\pi\)'),
(3,'D','\(0\le x\le2\)');

-- Question 4
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(4,'A','\((3,12)\)'),
(4,'B','\(\left(\frac{3}{2},7\right)\)'),
(4,'C','\(\left(\frac{3}{2},12\right)\)'),
(4,'D','\((3,7)\)');

-- Question 5
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(5,'A','\((3,4)\)'),
(5,'B','\((3,-4)\)'),
(5,'C','\((3,1)\)'),
(5,'D','\((3,-1)\)');

-- Question 6
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(6,'A','1'),
(6,'B','2'),
(6,'C','3'),
(6,'D','4');

-- Question 7
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(7,'A','1'),
(7,'B','2'),
(7,'C','3'),
(7,'D','4');

-- Question 8
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(8,'A','\(\{2\}\)'),
(8,'B','\(\{\,y\mid -1\le y\le1\,\}\)'),
(8,'C','\(\{\,y\mid -2\le y\le2\,\}\)'),
(8,'D','\(\{\,y\mid 0\le y\le4\,\}\)');
