const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const { sequelize } = require("./util/database");
const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/item");
const userRoutes = require("./routes/user");
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images");
    },
    filename: (req, file, cb) => {
        cb(
            null,
            Math.floor(Math.random() * 90000) + 10000 + "-" + file.originalname
        );
    },
});
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/jpg"
    )
        cb(null, true);
    else cb(null, false);
};
const app = express();
const upload = multer({ storage: fileStorage, fileFilter: fileFilter });
app.use(bodyParser.json());
app.use("/images", express.static(path.join(__dirname, "images")));
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});
app.use("/auth", upload.array("images", 10), authRoutes);
app.use("/seller", upload.single("image"), itemRoutes);
app.use(userRoutes);
app.use((error, req, res, next) => {
    console.error(error + "--------------------------");
    const statusCode = error.statusCode || 500;
    const message = error.message;
    let errorsPresent;
    if (error.errors) {
        errorsPresent = error.errors;
    }
    res.status(statusCode).json({
        message: message,
        errors: errorsPresent,
    });
});
const clients = {};
sequelize
    .sync()
    .then(() => {
        const server = app.listen(5000);
        const io = require("./util/socket").init(server);
        io.on("connection", (socket) => {
            socket.on("add-user", (data) => {
                clients[data.userId] = {
                    socket: socket.id,
                };
            });
            socket.on("disconnect", () => {
                for (const userId in clients) {
                    if (clients[userId].socket === socket.id) {
                        delete clients[userId];
                        break;
                    }
                }
            });
        });
        console.log("Connected to the database and server is running on port 5000");
    })
    .catch((err) => console.log(err));
exports.clients = clients;