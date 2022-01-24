import express from 'express'
import pg from 'pg'
import session from 'express-session'
import FileStore from 'session-file-store'
import multer from 'multer'

const app = express();
const {Pool} = pg
const createFileStore = FileStore(session);
const multerUpload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs'); //ejs
app.use(express.static('public')); //css
app.use(express.static('uploads')); //multer
app.use(express.urlencoded({ extended: false })); // request.body

// SETUP PG ============================================================
const pgConfig = {
  user: 'ben',
  host: 'localhost',
  database: 'project2',
  port: 5432
}
const pool = new Pool(pgConfig);

// SETUP SESSION =======================================================
app.use(session({
  store: new createFileStore(),
  secret:"keyboard cat",
  resave: false,
  saveUninitialized: true
}))

//LOGIN ROUTE ===========================================================
app.get('/login', (req,res)=>{  
  res.render('login')
})

app.post('/login', async (req,res)=>{ 
  console.log(req.body)
 
  let values = [req.body.username]
  let results = await pool.query(`SELECT id, password FROM users WHERE username =$1`, values)

  if (results.rows.length === 0) {
    res.render('login-failed1')

  } else if (results.rows[0].password === req.body.password)  {
    req.session.username = req.body.username;
    req.session.userid = results.rows[0].id;    
    res.redirect('/user')

  } else {
    res.render('login-failed2')
  }
})

//LOGOUT ROUTE ===========================================================
app.get('/logout', (req,res)=>{
  // req.session.username = '';
  // req.session.userid = '';
  req.session.destroy();
  res.redirect('/login')
})

//SIGN UP ROUTE ===========================================================
app.get('/signup', (req,res)=>{
  res.render('signup')
})

app.post('/signup', multerUpload.single('photo'), async (req,res)=>{
  console.log(req.body)

  let values = [req.body.name, req.body.username, req.body.password, req.body.email, req.file.filename]
  await pool.query (`INSERT INTO users (name, username, password, email, status, photo) VALUES ($1, $2, $3, $4, 'Available', $5)`, values)
  res.redirect('/login')  
})

// USER DASHBOARD ROUTE ====================================================
app.get('/user', async (req,res)=>{

  if (! req.session.userid ) {
    res.redirect('/login');
    return;
  } 

  let sessionUserId = [req.session.userid]; 

  let userInfo = await pool.query(
    'SELECT * FROM users WHERE id =$1', sessionUserId
    )  
  
  let childInfo = await pool.query(
    'SELECT u.name, u.username, u.email, u.status, u.photo, c.id, c.name AS child_name, c.dob, c.gender, c.status AS child_status, c.activity, c.photo AS child_photo FROM children AS c JOIN users AS u ON u.id = c.user_id WHERE u.id =$1', sessionUserId
    ) 

  res.render('dashboard-user', {
    'userdata': userInfo.rows,
    'childdata': childInfo.rows
  })

  console.log(userInfo.rows)
  console.log(childInfo.rows)

})

app.post('/user', async (req,res)=>{     
  let userStatus = [req.body.status]
  await pool.query('UPDATE users SET status = $1', userStatus)
  res.redirect('/user')
})

// USER DASHBOARD: ADD CHILD ===============================================
app.get('/addchild', (req,res)=>{

  if (! req.session.userid ) {
    res.redirect('/login');
    return;
  }
 res.render('form-add-child')
})

app.post('/addchild', multerUpload.single('photo'), async(req,res)=>{
 
  let userId = req.session.userid;

  let values = [req.body.name, req.body.dob, req.body.gender, userId, req.file.filename]

  await pool.query(`INSERT INTO children (name, dob, gender, status, activity, user_id, photo) VALUES ($1, $2, $3,'free','playing',$4, $5)`, values)

  res.redirect('/user') 
})

// USER DASHBOARD: EDIT CHILD ==========================
app.get('/editChild/:id', (req,res)=>{

  if (! req.session.userid ) {
    res.redirect('/login');
    return;
  }
 res.render('form-edit-child')
})

app.post('/editChild/:id', multerUpload.single('photo'), async(req,res)=>{
  console.log(req.body)

  let childId = req.params.id  

  let values = [req.body.name, req.body.dob, req.body.gender, childId, req.file.filename]

  await pool.query(' UPDATE children SET name = $1, dob = $2, gender = $3, photo = $5 WHERE id = $4', values)

  res.redirect('/user') 
})

// USER DASHBOARD: DEL CHILD =============================

app.get('/delchild/:id', (req,res)=>{

  if (req.session.userid === "") {
    res.redirect("/login");
    return;
  } 
  res.render('form-del-child')
})

app.post('/delchild/:id', async(req,res)=>{
 let childId = [req.params.id]
 await pool.query("DELETE FROM children WHERE id = $1", childId);
 res.redirect('/user')
})

// CHILD DASHBOARD ROUTE=======================================

app.get('/child/:id', async(req,res)=>{

  if (req.session.userid === "") {
    res.redirect("/login");
    return;
  }   
  let sessionUserId = [req.session.userid, req.params.id]; 
  let childID = [req.params.id, req.session.date];
  

  let userQueryResults = await pool.query(
    'SELECT u.name, u.username, u.email, u.status, c.id, c.name AS child_name, c.dob, c.gender, c.status AS child_status, c.activity, c.photo AS child_photo FROM children AS c JOIN users AS u ON u.id = c.user_id WHERE u.id =$1 AND c.id =$2', sessionUserId)     

  let eventQueryResults = await pool.query(
    'SELECT e.id AS event_id, e.date, e.description, e.child_id, e.title, e.image, e.time, c.id FROM events AS e JOIN children AS c ON e.child_id = c.id WHERE c.id = $1 AND e.date = $2',childID)   

    console.log(eventQueryResults.rows[0])

  res.render('dashboard-child', {
    'userdata': userQueryResults.rows,    
    'eventdata': eventQueryResults.rows   
  })
})

app.post('/child/:id', async (req,res)=>{ 
  let childId = req.params.id   
  let values = [req.body.activity, childId]
  req.session.date = req.body.date;
  console.log(req.session.date)
  console.log(req.body.date)
  await pool.query('UPDATE children SET activity = $1 WHERE id= $2', values)  
  
  res.redirect('/user')
})

// CHILD DASHBOARD: ADD EVENT  =============================

app.get('/child/addevent/:id', (req,res)=>{
  if (req.session.userid === "") {
    res.redirect("/login");
    return;
  } 
 res.render('form-add-event')
}) 

app.post('/child/addevent/:id', multerUpload.single('image'), async(req,res)=>{
  console.log(req.body)
  console.log(req.params)

  let eventID = req.params.id
  let values = [req.body.date, req.body.description, eventID, req.body.title, req.file.filename, req.body.time]

  await pool.query('INSERT INTO events (date, description, child_id, title, image, time) VALUES ($1,$2,$3,$4,$5,$6)', values)

 res.redirect('/user') 
})

// CHILD DASHBOARD: EDIT EVENT  =============================

app.get('/child/editevent/:eventid', (req,res)=>{
  if (req.session.userid === "") {
    res.redirect("/login");
    return;
  } 
 res.render('form-edit-event')
})

app.post('/child/editevent/:eventid', multerUpload.single('image'), async(req,res)=>{
  console.log(req.body)
  console.log(req.params)

  let eventID = req.params.eventid
  let values = [req.body.date, req.body.description, eventID, req.body.title, req.file.filename, req.body.time]

  await pool.query('UPDATE events SET date= $1, description= $2, title= $4, image= $5, time= $6 WHERE id= $3', values)

 res.redirect('/user') 
})

// CHILD DASHBOARD: DEL EVENT  =============================

app.get('/child/delevent/:eventid', (req,res)=>{
  if (req.session.userid === "") {
    res.redirect("/login");
    return;
  } 
 res.render('form-del-event')
})

app.post('/child/delevent/:eventid', async (req,res)=>{
 let eventId = [req.params.eventid]
 await pool.query("DELETE FROM events WHERE id = $1", eventId);
 res.redirect('/user')
}) 

// END =====================================================
app.listen(3004);