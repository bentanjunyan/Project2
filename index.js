import express from 'express'
import pg from 'pg'
import session from 'express-session'
import FileStore from 'session-file-store'

const app = express();
const {Pool} = pg
const createFileStore = FileStore(session);

app.set('view engine', 'ejs'); //ejs
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
    res.send("Login Success")
    // res.redirect('/user') why does code break when i try to redirect / async issue ? 

  } else {
    res.send('Login Failed.')
  }
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

// USER DASHBOARD ROUTE ===================================================='continue here later'
app.get('/user', async (req,res)=>{

  if (req.session.userid === "") {
    res.redirect("/login");
    return;
  } 

  let values = [req.session.userid];
  let results = await pool.query('SELECT * FROM users WHERE id = $1', values)

  // res.send(results.rows[0])
  res.render('dashboard-user', {
    'user': results.rows[0]
  })
})

// USER DASHBOARD: ADD CHILD ===========================
app.get('/user/addchild', (req,res)=>{
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

 res.redirect('/user') // can i skip render and enter redirect? page only render after i click submit
 //res.redirect('')
})

// USER DASHBOARD: EDIT CHILD ==========================
app.get('/child/:childid/edit', (req,res)=>{
 res.render('form-edit-child')
})

app.put('/user/:id/editchild', (req,res)=>{
  console.log(req.body)
 res.render('dashboard-user') 
})

// USER DASHBOARD: DEL CHILD =============================

app.get('/user/:id/delchild', (req,res)=>{
 res.render('form-del-child')
})

app.delete('/user/:id/delchild', (req,res)=>{
 res.render('dashboard-user')
})

// CHILD DASHBOARD =======================================

app.get('/user/:id/:child', (req,res)=>{
 res.render('dashboard-child')
})

// CHILD DASHBOARD: EDIT PICKUP ===========================

app.get('/user/:id/:child/editpickup', (req,res)=>{
 res.render('form-edit-pickup')
}) 

app.put('/user/:id/:child/editpickup', (req,res)=>{
  console.log(req.body)
 res.render('dashboard-child')
})

// CHILD DASHBOARD: ADD EVENT  =============================

app.get('/user/:id/:child/addevent', (req,res)=>{
 res.render('form-add-event')
}) 

app.post('/user/:id/:child/addevent', (req,res)=>{
  console.log(req.body)
 res.render('dashboard-child') 
})

// CHILD DASHBOARD: EDIT EVENT  =============================

app.get('/user/:id/:child/editevent', (req,res)=>{
 res.render('form-edit-event')
})

app.put('/user/:id/:child/editevent', (req,res)=>{
  console.log(req.body)
 res.render('dashboard-child')
})

// CHILD DASHBOARD: DEL EVENT  =============================

app.get('/user/:id/:child/delevent', (req,res)=>{
 res.render('form-del-event')
})

app.delete('/user/:id/:child/delevent', (req,res)=>{
 res.render('dashboard-child')
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