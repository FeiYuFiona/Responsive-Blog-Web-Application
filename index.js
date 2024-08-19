import express from "express";
import bodyParser from "body-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import session from 'express-session';
import flash from "connect-flash";
import { readFile, writeFile } from 'fs/promises';


const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(flash());

app.use(session({
  secret: 'your_secret_key', 
  resave: false,            
  saveUninitialized: true,   
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use((req, res, next) => {
  if (req.session.user) {
    req.user = req.session.user; 
  } else {
    req.user = null;
  }
  next();
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFilePath = path.join(__dirname, 'users.json');
const postsFilePath = path.join(__dirname, 'post.json');





async function readPosts() {
  try {
      const data = await readFile(postsFilePath, 'utf-8');
      return JSON.parse(data);
  } catch (err) {
      console.error('Error reading posts:', err);
      return [];
  }
}

async function writePosts(posts) {
  try {
      await writeFile(postsFilePath, JSON.stringify(posts, null, 2));
  } catch (err) {
      console.error('Error writing posts:', err);
  }
}





app.get("/", async (req, res) => {
  try {
      const posts = await readPosts();
      const messages = {};
      res.render("index.ejs", { user: req.user, posts: posts, messages: messages });
  } catch (err) {
      console.error('Error fetching posts:', err);
      res.status(500).send("Error fetching posts");
  }
});





app.post('/', async (req, res) => {
  const { title, content } = req.body;
  const username = req.user ? req.user.username : 'Anonymous';
  console.log('Form data received:', { username, title, content });

  try {
      const posts = await readPosts();
      console.log('Current posts:', posts);

      posts.push({ username, title, content });
      await writePosts(posts);
      console.log('Post saved successfully');

      res.redirect('/');
  } catch (err) {
      console.error('Error saving post:', err);
      res.status(500).send("Error saving post");
  }
});





app.get("/about", (req, res) => {
    const messages = {};
    res.render("about.ejs", { user: req.user, messages: messages});
});





  app.get("/login", (req, res) => {
    res.render("login.ejs", { user: req.user, messages: req.flash()});
  });


  app.post("/login", async (req, res) => {
    try {
      const data = await fs.readFile(usersFilePath, 'utf8');
      const users = JSON.parse(data);
      let user = {
        username: req.body["username"],
        password: req.body["password"]
      };

      const existingUser = users.find(
        u => u.username === user.username && u.password === user.password
      );
  
      if (!existingUser) {
        req.flash('error', 'Invalid username or password.');
        return res.redirect('/login');
      }
  
      req.session.user = existingUser;
      res.redirect('/'); 
      console.log('User authenticated successfully');
    }
    catch (err) {
      console.error("Error details:", err);
    }
  });





  app.get("/signUp", (req, res) => {
    res.render("signUp.ejs", { user: req.user, messages: req.flash()});
  });


  app.post("/signUp", async (req, res) => {
    
    try {
      const data = await fs.readFile(usersFilePath, 'utf8');
      let users = JSON.parse(data);
      let user = {
          username: req.body["username"],
          password: req.body["password"]
      };

      const existingUser = users.find(
        u => u.username === user.username && u.password === user.password
      );

      if (existingUser) {
        req.flash('error', 'Username already existed. Change another username.');
        res.redirect("/signUp"); 
      }
      else{
        users.push(user);
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        req.flash('success', 'Signup successful! Please log in.');
        res.redirect('/login');
      }  
    } catch (err) {
        console.error("Error details:", err);
        res.status(500).send("An error occurred while saving the user.");
    }
  });




  
  app.get("/loggedIn", (req, res) => {
    res.render("loggedIn.ejs", { user: req.user });
  });

  app.get("/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).send("An error occurred during logout.");
      }
      res.redirect("/"); 
    });
  });





app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});