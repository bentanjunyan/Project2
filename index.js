import express from 'express'
import pg from 'pg'
import session from 'express-session'
import FileStore from 'session-file-store'

const app = express();
const {Pool} = pg
const createFileStore = FileStore(session);

app.set('view engine', 'ejs'); //ejs
app.use(express.static("public"));
// app.use('*/css',express.static('public/css'));
app.use(express.urlencoded({ extended: false })); // request.body


// SETUP PG ============================================================
const pgConfig = {
  user: 'BEN',
  host: 'localhost',
  database: 'BEN',
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
    res.send("Username does not exist.")

  } else if (results.rows[0].password === req.body.password)  {
    req.session.username = req.body.username;
    req.session.userid = results.rows[0].id;    
    res.redirect('/userloggingin')

  } else {
    res.send('Login Failed.')
  }
})

//USERLOGGINGIN ROUTE ====================================================
app.get ('/userloggingin', (req,res)=>{
  res.render('login2')
})

app.post ('/userloggingin', (req,res)=>{
  res.redirect('/user')
})

//LOGOUT ROUTE ===========================================================
app.get('/logout', (req,res)=>{
  req.session.username = '';
  req.session.userid = '';
  res.redirect('/login')
})

//SIGN UP ROUTE ===========================================================
app.get('/signup', (req,res)=>{
  res.render('signup')
})

app.post('/signup', async (req,res)=>{
  console.log(req.body)

  let values = [req.body.name, req.body.username, req.body.password, req.body.email]
  await pool.query (`INSERT INTO users (name, username, password, email, status) VALUES ($1, $2, $3, $4, 'Available')`, values)
  res.send("Account Successfully Created. Please Login.")  
})

// USER DASHBOARD ROUTE ====================================================
app.get('/user', async (req,res)=>{

  // if (req.session.userid === "") {
  //   res.redirect("/login");
  //   return;
  // } 

  let sessionUserId = [req.session.userid]; 
  
  let results = await pool.query(
    'SELECT u.name, u.username, u.email, u.status, c.id, c.name AS child_name, c.dob, c.gender, c.status AS child_status, c.activity FROM children AS c JOIN users AS u ON u.id = c.user_id WHERE u.id =$1', sessionUserId
    ) 

  console.log(results.rows)

  res.render('dashboard-user', {
    'userdata': results.rows    
  })
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

app.post('/user/addchild', async(req,res)=>{
 
  let userId = req.session.userid;

  let values = [req.body.name, req.body.dob, req.body.gender, userId]

  await pool.query(`INSERT INTO children (name, dob, gender, status, activity, user_id) VALUES ($1,$2,$3,'free','rest',$4)`, values)

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

app.post('/editChild/:id', async(req,res)=>{
  console.log(req.body)

  let childId = req.params.id
  console.log(req.params.id)

  let values = [req.body.name, req.body.dob, req.body.gender, childId]

  await pool.query(' UPDATE children SET name = $1, dob = $2, gender = $3 WHERE id = $4', values)

  res.redirect('/user') 
})

// USER DASHBOARD: DEL CHILD =============================

app.get('/delchild/:id', (req,res)=>{
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
  let childID = [req.params.id];

  let userQueryResults = await pool.query(
    'SELECT u.name, u.username, u.email, u.status, c.id, c.name AS child_name, c.dob, c.gender, c.status AS child_status, c.activity FROM children AS c JOIN users AS u ON u.id = c.user_id WHERE u.id =$1 AND c.id =$2', sessionUserId) 

    

  let eventQueryResults = await pool.query(
    'SELECT e.id AS event_id, e.date, e.description, e.child_id, c.id FROM events AS e JOIN children AS c ON e.child_id = c.id WHERE c.id = $1',childID)   

    console.log(eventQueryResults.rows[0])

  res.render('dashboard-child', {
    'userdata': userQueryResults.rows,    
    'eventdata': eventQueryResults.rows   
  })
})

app.post('/child/:id', async (req,res)=>{ 
  let childId = req.params.id   
  let values = [req.body.status, childId]
  await pool.query('UPDATE children SET status = $1 WHERE id= $2', values)  
  
  res.redirect('/user')
})

// CHILD DASHBOARD: ADD EVENT  =============================

app.get('/child/addevent/:id', (req,res)=>{
 res.render('form-add-event')
}) 

app.post('/child/addevent/:id', async(req,res)=>{
  console.log(req.body)
  console.log(req.params)

  let childID = req.params.id
  let values = [req.body.date, req.body.description, childID]

  await pool.query('INSERT INTO events (date, description, child_id) VALUES ($1,$2,$3)', values)

 res.redirect('/user') 
})



// CHILD DASHBOARD: EDIT EVENT  =============================

app.get('/child/editevent/:eventid', (req,res)=>{
 res.render('form-edit-event')
})

app.post('/child/editevent/:eventid', async(req,res)=>{
  console.log(req.body)
  console.log(req.params)

  let eventID = req.params.eventid
  let values = [req.body.date, req.body.description, eventID]

  await pool.query('UPDATE events SET date= $1, description= $2 WHERE id= $3', values)

 res.redirect('/user') 
})

// CHILD DASHBOARD: DEL EVENT  =============================

app.get('/child/delevent/:eventid', (req,res)=>{
 res.render('form-del-event')
})

app.post('/child/delevent/:eventid', async (req,res)=>{
 let eventId = [req.params.eventid]
 await pool.query("DELETE FROM events WHERE id = $1", eventId);
 res.redirect('/user')
}) 

// END =====================================================
app.listen(3004);







// function checkIfAuthenticated(req,res,next) {
//   if (req.session.userid) {
//     next()
//   } else {
//     res.redirect('/login');
//   }
// }

// delete user
// app.get('/delete-user/:id', async (req,res)=>{
//   let results = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);

//   res.render('confirm-delete',{
//     user: results.rows[0]
//   })
// })

// app.post('/delete-user/:id', async(req,res)=>{
//   await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
//   res.send("User has been deleted");
// })


// APP FEATURES

// login - logout
// c r u d - child
// c r u d - checklist

// status parents
// status child