import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import path from 'path';
import axios from 'axios'
import { stdin } from 'process';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',

}))
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
})

const rooms = new Map();
const allUsers = {};

io.on('connection', (socket) => {
    console.log("client connected", socket.id);
    let currentuser;
    let connectedUser;
    let currentRoom = null;
    let currentUser = null;

    socket.on("join", ({ roomId, userName }) => {

        if (currentRoom) {
            socket.leave(currentRoom);
            rooms.get(currentRoom).users.delete(userName);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
        }
        currentRoom = roomId;
        currentUser = userName;
        socket.join(roomId);
        currentuser = userName;
        console.log("joined user name is ", userName);
        allUsers[userName] = { userName, id: socket.id }
        //inform everyone that someone joined 
        if (!rooms.has(roomId)) {
            rooms.set(roomId, { users: new Set(), code: "//start typing here..", language: "javascript" });
        }

        rooms.get(roomId).users.add(userName);

        socket.emit("codeUpdate", rooms.get(roomId).code);
        socket.emit("languageUpdate", rooms.get(roomId).language)
        io.to(roomId).emit("userJoined", Array.from(rooms.get(currentRoom).users));


        // console.log({roomId,userName,currentRoom,currentUser,rooms})

        console.log("user joined", roomId, userName);


    })
    socket.on("typing", ({ roomId, userName }) => {
        io.to(roomId).emit("userTyping", userName);
    })

    socket.on('codeChange', ({ roomId, code }) => {
        console.log({ roomId, code });
        if (rooms.has(roomId)) {
            rooms.get(roomId).code = code;
        }
        io.to(roomId).emit("codeUpdate", code);
    })

    socket.on('languageChange', ({ roomId, language }) => {
        if (rooms.has(roomId)) {
            rooms.get(roomId).language = language;
        }
        io.to(roomId).emit("languageUpdate", language);
    })

    socket.on("compileCode", async ({ code, roomId, language, version, input }) => {
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
                language,
                version,
                files: [
                    { content: code }
                ],
                stdin: input
            });

            room.output = response.data.run.output;
            io.to(roomId).emit("codeResponse", response.data);




        }
    })

    socket.on('leaveRoom', () => {
        if (currentRoom && currentUser) {
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
            socket.leave(currentRoom);
            currentRoom = null;
            currentUser = null;

        }
    })
    socket.on("offer", ({ from, to, offer }) => {
        // console.log({from,to,offer});
        // console.log({ from, to });
        io.to(allUsers[to].id).emit("offer", { from, to, offer });
        if (currentuser === from) {
            connectedUser = to;
        }
        else {
            connectedUser = from;
        }
    })
    socket.on("answer", ({ from, to, answer }) => {
        // console.log({from,to,offer});
        io.to(allUsers[from].id).emit("answer", { from, to, answer });
    })
    socket.on("icecandidate", ({ candidate, user }) => {
        // console.log({ candidate });
        //broadcast to other peers 

        // console.log(allUsers[caller[1]]);
        // console.log(user);
        socket.broadcast.to(allUsers[user].id).emit("icecandidate", candidate)
        // io.to(allUsers[caller[1]].id).emit("icecandidate", candidate);
    });

    socket.on("end-call", ({ from, to }) => {
        io.to(allUsers[to]?.id).emit("end-call", { from, to });
    })

    socket.on("call-ended", (caller) => {
        io.to(allUsers[caller[0]]?.id).emit("call-ended", caller);
        io.to(allUsers[caller[1]]?.id).emit("call-ended", caller);
    })

    socket.on("disconnect", () => {
        if (currentRoom && currentUser) {
            delete allUsers[currentuser];
            currentUser = "";
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
        }
    })

})

const port = process.env.PORT || 8000;

// const __dirname = path.resolve();
// console.log(path.join(__dirname, "/frontend/dist"))
// console.log(path.join(__dirname, "frontend", "dist", "index.html"))
// app.use(express.static(path.join(__dirname, "/frontend/dist")));
// app.get("/{*any}", (req, res) => {
//     res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"))
// })

app.get("/", (req, res) => { res.send("Api is working fine") })

server.listen(port, () => {
    console.log(`server running on port : ${port}`)
})