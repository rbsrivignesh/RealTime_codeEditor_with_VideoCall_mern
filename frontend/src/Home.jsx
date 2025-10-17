import React from 'react'

const Home = () => {
   const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setcode] = useState("//start Typing here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [output,setOutput] = useState("");
  const [version, setVersion] = useState("*");
  const [input,setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
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
    socket.on("languageUpdate",(newLanguage)=>{
      setLanguage(newLanguage);
    })
    socket.on("codeResponse",(res)=>{
      setOutput(res.run.output);
      setLoading(false);
    })

   


    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping")
      socket.off("languageUpdate");
      socket.off("codeResponse");
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
  const leaveRoom = ()=>{
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
  const handleLanguageChange = (e)=>{
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
     socket.emit('languageChange',{roomId , language:newLanguage});
  }
  const runCode = ()=>{
    console.log("clicked");
    setLoading(true)
    socket.emit("compileCode",({roomId,code,language,version,input}));
  }
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied");
    setTimeout(() => { setCopySuccess("") }, 2000);
  }

  const createRoomId = ()=>{
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
          {users?.map((user, index) => (<li key={index}><div id='div_inside_li'>{user} <span>call</span></div></li>))}


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
        <Editor height={"60%"} defaultLanguage={language} language={language} value={code} onChange={handleCodeChange} theme='vs-dark' options={
          {
            minimap: { enabled: false },
            fontSize: 14
          }
        } />
        <textarea className='input-console' value={input} onChange={(e)=>setInput(e.target.value)} placeholder='Enter inputs here' name="" id=""></textarea>
        <button disabled={loading} className='run-btn' onClick={runCode}>{loading ? "Loading..." : "Execute"}</button>
        <textarea className='output-console' value={output} name="" id="" readOnly placeholder='Output will be here....'></textarea>
      </div>
    </div>
  )

}

export default Home