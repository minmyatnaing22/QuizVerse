INSERT INTO questions
(chapter_id, question_number, question_text, question_type)
VALUES
(
7,
1,
'The domain of \(y=\sin\frac{\pi}{2}x\) is',
'MCQ'
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type)
VALUES
(
7,
2,
'If the restricted domain of \(y=\sin x\) is \(0\le x\le2\pi\), then the corresponding restricted domain of \(y=\sin\frac{\pi}{2}x\) is',
'MCQ'
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type)
VALUES
(
7,
3,
'If the restricted domain of \(y=\cos x\) is \(0\le x\le\pi\), then the corresponding restricted domain of \(y=\cos\frac{\pi}{2}x\) is',
'MCQ'
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type)
VALUES
(
7,
4,
'The maximum point of the graph of \(y=2\sin\frac{\pi}{3}x+5\) is',
'MCQ'
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type)
VALUES
(
7,
5,
'The minimum point of the graph of \(y=2\cos\frac{\pi}{3}x+3\) is',
'MCQ'
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type)
VALUES
(
7,
6,
'For the graph of \(y=3\sin2(x+1)+4\), the amplitude is',
'MCQ'
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type)
VALUES
(
7,
7,
'For the graph of \(y=-2\cos\pi(x+1)+3\), the amplitude is',
'MCQ'
);

INSERT INTO questions
(chapter_id, question_number, question_text, question_type)
VALUES
(
7,
8,
'The range of the function \(y=-2\sin\frac{\pi}{2}(x-3)+2\) is',
'MCQ'
);

INSERT INTO question_answers
(question_id, correct_answer)
VALUES
(12, 'B'),
(13, 'B'),
(14, 'D'),
(15, 'B'),
(16, 'C'),
(17, 'C'),
(18, 'B'),
(19, 'B');

============================================================================================

-- Question 1
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(12,'A','\([-1,1]\)'),
(12,'B','\(\mathbb{R}\)'),
(12,'C','\(\mathbb{R}\setminus\{0\}\)'),
(12,'D','\(\mathbb{R}\setminus\{1\}\)');

-- Question 2
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(13,'A','\(0\le x\le\pi\)'),
(13,'B','\(0\le x\le4\)'),
(13,'C','\(0\le x\le2\pi\)'),
(13,'D','\(0\le x\le2\)');

-- Question 3
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(14,'A','\(0\le x\le\pi\)'),
(14,'B','\(0\le x\le4\)'),
(14,'C','\(0\le x\le2\pi\)'),
(14,'D','\(0\le x\le2\)');
-- Question 4
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(15,'A','\((3,12)\)'),
(15,'B','\(\left(\frac{3}{2},7\right)\)'),
(15,'C','\(\left(\frac{3}{2},12\right)\)'),
(15,'D','\((3,7)\)');

-- Question 5
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(16,'A','\((3,4)\)'),
(16,'B','\((3,-4)\)'),
(16,'C','\((3,1)\)'),
(16,'D','\((3,-1)\)');

-- Question 6
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(17,'A','1'),
(17,'B','2'),
(17,'C','3'),
(17,'D','4');

-- Question 7
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(18,'A','1'),
(18,'B','2'),
(18,'C','3'),
(18,'D','4');

-- Question 8
INSERT INTO question_options
(question_id, option_label, option_text)
VALUES
(19,'A','\(\{2\}\)'),
(19,'B','\(\{\,y\mid -1\le y\le1\,\}\)'),
(19,'C','\(\{\,y\mid -2\le y\le2\,\}\)'),
(19,'D','\(\{\,y\mid 0\le y\le4\,\}\)');
