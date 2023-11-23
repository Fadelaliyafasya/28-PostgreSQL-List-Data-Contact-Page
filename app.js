const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const {
  addContact,
  fetchContact,
  searchContact,
  duplicateCheck,
  deleteContact,
  updateContacts,
  emailDuplicateCheck,
} = require("./utility/contacts.js");
const sess = require("express-session");
const flash = require("connect-flash");
const cParser = require("cookie-parser");
const { body, check, validationResult } = require("express-validator");
const app = express();

// Konfigurasi alamat host dan port
const host = "localhost"; // alamat host
const port = 3000; // alamat port

const pool = require("./db.js");

// Mengatur view engine menggunakan EJS
app.set("view engine", "ejs");

// req.body
app.use(express.json());

app.use(expressLayouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cParser("secret"));

//middleware session
app.use(
  sess({
    cookie: { maxAge: 3000 },
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(flash());

app.get("/", (req, res) => {
  res.render("index", {
    namaWeb: "around world.",
    title: "around world.",
    layout: "layout/core-layout",
  });
});

// "Nalendra Mahawira Aliyafasya";
// "082121565032";
// "nalendramahawira@gmail.com"

app.get("/addsync", async (req, res) => {
  try {
    const nama = "";
    const nomorhp = "";
    const email = "";
    const newCont = await pool.query(
      `INSERT INTO contacts values ('${nama}', '${nomorhp}', '${email}') RETURNING *`
    );
    res.json(newCont);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("<h1>internal server error</h1>");
  }
});

app.get("/list", async (req, res) => {
  try {
    const contact = await pool.query(`SELECT * FROM contacts`);
    res.json(contact.rows);
  } catch (err) {
    console.log(err.message);
  }
});

// Handle permintaan GET ke "/about" dan mengirimkan file "about.html"
app.get("/about", (req, res) => {
  res.render("about", {
    title: "around world. - About",
    layout: "layout/core-layout",
  });
});

// Handle permintaan GET ke "/contact" dan mengirimkan file "contact.html"
app.get("/contact", async (req, res) => {
  try {
    const contactsList = await pool.query("SELECT * FROM contacts");
    const contacts = contactsList.rows;
    // Menampilkan pesan pemberitahuan jika objek contacts kosong
    res.render("contact", {
      title: "around world. - Contact",
      contacts,
      layout: "layout/core-layout.ejs", // Ejs core layout
      message: req.flash("message"),
    });
  } catch (err) {
    console.error(err.message);
    res.render("contact", {
      title: "around world. - Contact",
      contacts: [],
      layout: "layout/core-layout.ejs", // Ejs core layout
      message: req.flash("message"),
    });
  }
});

// Menghandle permintaan GET untuk endpoint "/contact/add"
app.get("/contact/add", (req, res) => {
  // Merender tampilan "add-contact" dengan parameter yang ditentukan
  res.render("add-contact", {
    title: "around world. - Add Contact",
    layout: "layout/core-layout.ejs",
  });
});

// Menghandle permintaan POST untuk endpoint "/contact"
// Definisi endpoint POST "/contact"
app.post(
  "/contact",
  [
    // Middleware menggunakan express-validator untuk memvalidasi data
    body("nama").custom((value) => {
      // Memeriksa apakah nilai nama sudah terdaftar (menggunakan fungsi duplicateCheck)
      const duplicate = duplicateCheck(value);
      // Jika nilai nama sudah terdaftar, lemparkan error
      if (duplicate) {
        throw new Error("Nama sudah terdaftar!!");
      }
      // Jika tidak ada error, kembalikan true untuk menunjukkan validasi berhasil
      return true;
    }),
    check("email", "Email tidak valid").isEmail(),
    check("nomorhp", "Nomor Handphone tidak valid").isMobilePhone("id-ID"),
  ],
  // Handler untuk mengelola permintaan POST
  (req, res) => {
    // Mengambil hasil validasi dari permintaan
    const errors = validationResult(req);
    // Memeriksa apakah ada error validasi
    if (!errors.isEmpty()) {
      // Jika ada error, menampilkan halaman "add-contact" dengan pesan error
      res.render("add-contact", {
        title: "around world - Add Contact",
        layout: "layout/core-layout.ejs",
        errors: errors.array(),
      });
    } else {
      // Jika tidak ada error validasi,
      // Memanggil fungsi addContact dengan data dari tubuh permintaan (request body)
      addContact(req.body);
      req.flash("message", "Data berhasil ditambahkan");
      // Mengarahkan pengguna ke halaman "/contact" setelah berhasil menambahkan kontak
      res.redirect("/contact");
    }
  }
);

app.get("/contact/delete/:nama", (req, res) => {
  const contact = searchContact(req.params.nama);

  if (!contact) {
    res.status(400);
    res.send("<h1>404 Not Found</h1>");
  } else {
    deleteContact(req.params.nama);
    req.flash("message", "Data berhasil dihapus");
    res.redirect("/contact");
  }
});

// Menghandle permintaan GET untuk endpoint "/contact/add"
app.get("/contact/update/:nama", (req, res) => {
  const contact = searchContact(req.params.nama);

  // Merender tampilan "add-contact" dengan parameter yang ditentukan
  res.render("update-contact", {
    title: "around world. - Update Contact",
    layout: "layout/core-layout.ejs",
    contact,
  });
});

// proses update data
app.post(
  "/contact/update",
  [
    // Middleware menggunakan express-validator untuk memvalidasi data
    body("nama").custom((value, { req }) => {
      // Memeriksa apakah nilai nama sudah terdaftar (menggunakan fungsi duplicateCheck)
      const duplicate = duplicateCheck(value);
      // Jika nilai nama sudah terdaftar, lemparkan error
      if (value !== req.body.namaLama && duplicate) {
        throw new Error("Nama sudah terdaftar!!");
      }
      // Jika tidak ada error, kembalikan true untuk menunjukkan validasi berhasil
      return true;
    }),
    // Middleware menggunakan express-validator untuk memvalidasi data enmail
    body("email").custom((value) => {
      // Memeriksa apakah nilai Email sudah terdaftar (menggunakan fungsi emailDuplicateCheck)
      const emailDuplicate = emailDuplicateCheck(value);
      // Jika nilai email sudah terdaftar, lemparkan error
      if (emailDuplicate) {
        throw new Error("Email sudah terdaftar!!");
      }
      // Jika tidak ada error, kembalikan true untuk menunjukkan validasi berhasil
      return true;
    }),
    check("email", "Email tidak valid").isEmail(),
    check("nomorhp", "Nomor Handphone tidak valid").isMobilePhone("id-ID"),
  ],
  // Handler untuk mengelola permintaan POST
  (req, res) => {
    // Mengambil hasil validasi dari permintaan
    const errors = validationResult(req);

    // Memeriksa apakah ada error validasi
    if (!errors.isEmpty()) {
      // Jika ada error, menampilkan halaman "add-contact" dengan pesan error
      res.render("update-contact", {
        title: "around world - Update Contact",
        layout: "layout/core-layout.ejs",
        errors: errors.array(),
        contact: req.body,
      });
    } else {
      // Jika tidak ada error validasi,
      // Memanggil fungsi addContact dengan data dari tubuh permintaan (request body)
      updateContacts(req.body);
      req.flash("message", "Data berhasil diupdate");

      // Mengarahkan pengguna ke halaman "/contact" setelah berhasil menambahkan kontak
      res.redirect("/contact");
    }
  }
);

// middleware untuk detail contact
app.get("/contact/:nama", async (req, res) => {
  const nama = req.params.nama;
  const contacts = await fetchContact();
  const contact = contacts.find((contact) => contact.nama === nama);

  res.render("detail", {
    title: "around world. - Detail Contact",
    contact,
    isEmpty: true, // Variabel flag untuk menunjukkan bahwa objek kosong
    layout: "layout/core-layout.ejs", // Ejs core layout
  });
});

// Middleware untuk menangani permintaan yang tidak sesuai dengan rute yang ada
app.use("/", (req, res) => {
  res.status(404);
  res.send("<h1>404 Not Found</h1>");
});

// Menjalankan server Express pada host dan port yang ditentukan
app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
