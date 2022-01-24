CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  username VARCHAR(255),
  password VARCHAR(255),
  email VARCHAR(255),
  status VARCHAR(255),
  photo VARCHAR(255)
);

CREATE TABLE children (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  dob DATE,
  gender VARCHAR(1),
  status VARCHAR(255),
  activity VARCHAR(255),
  user_id INT
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  date DATE,
  description VARCHAR(255),
  child_id INT
);

INSERT INTO children (name, dob, gender, status, activity, user_id) VALUES ('test', '2022-01-04', 'M', 'test', 'test', 1);