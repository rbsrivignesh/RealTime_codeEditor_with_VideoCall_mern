import React from 'react'
import './App.css'
import io from 'socket.io-client'
import { useState } from 'react';
import Editor from '@monaco-editor/react'
import { useEffect } from 'react';
import { v4 as uuid } from 'uuid'
import { useRef } from 'react';
import { BsFillMicMuteFill } from "react-icons/bs";
import { FaMicrophone } from "react-icons/fa";
import { FaVideoSlash } from "react-icons/fa";
import { FaVideo } from "react-icons/fa";
const url = import.meta.env.MODE == "production" ? "https://realtime-codeeditor-with-videocall-mern.onrender.com" : "http://localhost:8000";
const socket = io(url);
const App = () => {

  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setcode] = useState("//start Typing here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("*");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoVisible, setVideoVisible] = useState(true);
  const localStream = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const [Audio, setAudio] = useState(true);
  const [caller, setCaller] = useState([])
  const called = useRef("");
  const receiver = useRef("");
  const [isMute, setIsMute] = useState(false);
  const [onCall, setOnCall] = useState(false);

  console.log(localVideo.current);
  const [peer, setPeer] = useState(false);

  const peerConnection = useRef(null);
  const createPeerConnection = async () => {

    if (!peerConnection.current) {

      const config = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }
        ]
      };

      peerConnection.current = new RTCPeerConnection(config);
      // add local stream to peer connnection 

      // listen to remote stream and add to peer connection 
      peerConnection.current.ontrack = function (event) {
        remoteVideo.current.srcObject = event.streams[0];
      }
      // listen to ice candidate

    }
  }

  useEffect(() => {
    createPeerConnection();
  }, []);










  const click_disconnect = () => {
    socket.emit("call-ended", [called.current, receiver.current]);
    setOnCall(false);
    endCall();

  }

  const endCall = async () => {
    console.log("executing")

    const pc = peerConnection.current;
    if (pc) {
      pc.close();
      peerConnection.current = null;
      receiver.current = null;
      called.current = null;
      await createPeerConnection();
    }
  }
  const startCall = async (user) => {
    setOnCall(true);
    called.current = userName;
    receiver.current = user;
    localStream?.current?.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, localStream.current);
    });
    peerConnection.current.onicecandidate = function (event) {
      if (event.candidate) {
        // console.log(called.current)
        // console.log(receiver.current)
        if (userName === called.current) {

          socket.emit("icecandidate", { candidate: event.candidate, user: receiver.current });
        }
        else { socket.emit("icecandidate", { candidate: event.candidate, user: called.current }); }
      }
    }
    // console.log(user);

    const pc = peerConnection.current;
    // console.log(pc);
    const offer = await pc.createOffer();
    // console.log(offer);
    await pc.setLocalDescription(offer);

    // console.log({ from: userName, to: user });

    // console.log({ from: userName, to: user })
    socket.emit("offer", { from: userName, to: user, offer: pc.localDescription });
  }


  const fetchVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });


    localStream.current = stream;
    // localVideo
    localVideo.current.srcObject = stream;
    // document.getElementById("localVideo").srcObject = stream;
    //  fetchVideo();
    console.log("calling fetchVideo")



  }


  useEffect(() => {
    fetchVideo();
  }, [joined, setJoined]);


  useEffect(() => {

    socket.on("offer", async ({ from, to, offer }) => {
      const pc = peerConnection.current;
      caller.current = from;
      receiver.current = to;
      setOnCall(true);


      // === ADD THIS: ensure receiver adds its local tracks so caller receives them ===
      if (localStream.current) {
        // avoid adding duplicate senders for same kind
        const existingKinds = pc.getSenders().map(s => s.track && s.track.kind).filter(Boolean);
        localStream.current.getTracks().forEach(track => {
          if (!existingKinds.includes(track.kind)) {
            pc.addTrack(track, localStream.current);
          }
        });
      }

      // set remote description (the offer)
      await pc.setRemoteDescription(offer);

      // create & set local answer, then send it
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { from, to, answer: pc.localDescription });

      // const call = [from, to];
      // setCaller(call);
      // console.log(caller);
    });


    socket.on("userJoined", (users) => {
      setUsers(users);
    })

    socket.on("codeUpdate", (codes) => {
      setcode(codes);
    })
    socket.on("userTyping", (user => {
      setTyping(user);
      setTimeout(() => { setTyping("") }, 2000);
    }));
    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    })
    socket.on("codeResponse", (res) => {
      setOutput(res.run.output);
      setLoading(false);
    })


    socket.on("answer", async ({ from, to, answer }) => {
      const pc = peerConnection.current;
      // console.log(answer)
      caller.current = from;
      receiver.current = to;

      //set remote description
      await pc.setRemoteDescription(answer);

      // endCallBtn.style.display = 'block';
      socket.emit("end-call", { from, to });
      // const call = [from, to];
      // setCaller(call);
      // console.log(caller);

    })

    socket.on("icecandidate", async (candidate) => {
      // console.log({ candidate });
      const pc = peerConnection.current;
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    })

    socket.on("end-call", ({ from, to }) => {
      // endCallBtn.style.display = 'block';
    })

    socket.on("call-ended", (caller) => {
      setOnCall(false);
      endCall();
      // endCallBtn.style.display = 'none';
    })

    //initialize app






    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping")
      socket.off("languageUpdate");
      socket.off("codeResponse");
      socket.off("offer")
      socket.off("answer")
      socket.off("end-call")
      socket.off("call-ended")
      socket.off("icecandidate")
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");

    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

    }
  }, [])


  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  }

  const hideVideo = () => {
    if (videoVisible) {

      localStream.current.getVideoTracks()[0].enabled = false
      setVideoVisible(false)
    }
    else {
      setVideoVisible(true);
      localStream.current.getVideoTracks()[0].enabled = true


    }
  }

  const mute = () => {
    if (Audio) {

      localStream.current.getAudioTracks()[0].enabled = false
      setAudio(false);
    }
    else {
      setAudio(true);
      localStream.current.getAudioTracks()[0].enabled = true


    }
  }



  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setcode("//start Typing here");
    setLanguage("javascript");

  }

  const handleCodeChange = (newCode) => {

    setcode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });


  }
  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit('languageChange', { roomId, language: newLanguage });
  }
  const runCode = () => {
    console.log("clicked");
    setLoading(true)
    socket.emit("compileCode", ({ roomId, code, language, version, input }));
  }
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied");
    setTimeout(() => { setCopySuccess("") }, 2000);
  }

  const createRoomId = () => {
    const roomIds = uuid();
    setRoomId(roomIds)
  }
  if (!joined) {
    return (
      <div className='join-container'>
        <div className="join-form">
          <h1>Join Code Room</h1>
          <input type="text" placeholder='Room Id' value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <button onClick={createRoomId}>Create Room ID</button>
          <input type="text" placeholder='Your Name' value={userName} onChange={(e) => setUserName(e.target.value)} />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    )
  }


  return (
    <div className="editor-container">

      <div className="sidebar">
        <div className="room-info">
          <h2>Code Room : {roomId}</h2>
          <button className='copy-button' onClick={copyRoomId}>Copy Id</button>
          {copySuccess && <span className='copy-success'>{copySuccess}</span>}
        </div>
        <h3>Users in Room:</h3>
        <ul>
          {users?.map((user, index) => (<li key={index}><div id='div_inside_li'>{user} {user == userName ? (<div>(YOU)</div>) : (<span onClick={() => startCall(user)}>call</span>)} </div></li>))}


        </ul>
        {typing && (<p className="typing-indicator">{typing} is typing...</p>)}
        <select className='language-selector' value={language} onChange={handleLanguageChange} name="" id="">
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
        <button onClick={leaveRoom} className="leave-button">Leave Button</button>
      </div>
      <div className="editor-wrapper">
        {/* {console.log(language)} */}
        <section className="video-call-container">

          <div className="video-streams">

            <div className="local-video">
              <video ref={localVideo} id="localVideo" autoPlay muted ></video>
              <span className='video-title'>{userName}</span>
              <div className='video-buttons'>

                <div onClick={mute}>{Audio ? (< FaMicrophone className='mute_button' color='red' />) : (< BsFillMicMuteFill className='mute_button' color='red' />)} </div>

                <div onClick={hideVideo}>
                  {videoVisible ? (< FaVideo className='video_button' color='red' />) : (< FaVideoSlash className='video_button' color='red' />)}
                </div>

              </div>
            </div>

            <div className="remote-video">
              <video ref={remoteVideo} id="remoteVideo" autoPlay ></video>
              {receiver.current && (<span className='video-title'>{receiver.current}</span>)}
            </div>
          </div>
          <div>
            {onCall ? (<button id="end-call-btn" onClick={click_disconnect} className="call call-disconnect d-none">
              {/* <img src="/images/phone-disconnect.png" alt=""/> */}disconnect
            </button>) : (<></>)}
          </div>
        </section>
        <Editor height={"60%"} defaultLanguage={language} language={language} value={code} onChange={handleCodeChange} theme='vs-dark' options={
          {
            minimap: { enabled: false },
            fontSize: 14
          }
        } />
        <textarea className='input-console' value={input} onChange={(e) => setInput(e.target.value)} placeholder='Enter inputs here' name="" id=""></textarea>
        <button disabled={loading} className='run-btn' onClick={runCode}>{loading ? "Loading..." : "Execute"}</button>
        <textarea className='output-console' value={output} name="" id="" readOnly placeholder='Output will be here....'></textarea>
      </div>
    </div>
  )

}

export default App
