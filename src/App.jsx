import React, { useState, useRef, Suspense, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, RoundedBox, Text, Environment } from '@react-three/drei';
import { Send, Video, VideoOff, Mic, MicOff, Users, PhoneOff, Copy, MessageSquare, Plus, Coffee, MonitorUp } from 'lucide-react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || null;

function RemoteVideo({ stream, userName, isMuted }) {
  const videoRef = useRef();
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!stream) return;
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    const updateTrackState = () => {
      const videoTracks = stream.getVideoTracks();
      const activeVideo = videoTracks.some(t => t.enabled && t.readyState === 'live');
      setHasVideo(activeVideo);
    };

    updateTrackState();
    stream.onaddtrack = updateTrackState;
    stream.onremovetrack = updateTrackState;
    
    const interval = setInterval(updateTrackState, 1000);
    return () => {
      clearInterval(interval);
      stream.onaddtrack = null;
      stream.onremovetrack = null;
    };
  }, [stream]);

  return (
    <div className="remote-video-container">
      <video 
        autoPlay 
        playsInline 
        ref={videoRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          display: hasVideo ? 'block' : 'none',
          transform: stream.id === 'local' ? 'scaleX(-1)' : 'none'
        }} 
      />
      {!hasVideo && (
        <div className="audio-only-placeholder">
          <div className="avatar large-avatar pulse-avatar">
            {userName?.charAt(0).toUpperCase() || '?'}
          </div>
          <span className="audio-label-text">{userName}</span>
        </div>
      )}
      {isMuted && (
        <div className="mute-indicator-overlay">
          <MicOff size={14} color="white" />
        </div>
      )}
    </div>
  );
}

function ChatBubble({ startPosition, color, text, speed, scale = 1, direction = [0, 1, 0], isMobile }) {
  const ref = useRef();
  const [randomOffset] = useState(() => Math.random() * 100);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Move along direction vector
    ref.current.position.x += direction[0] * delta * speed;
    ref.current.position.y += direction[1] * delta * speed;
    ref.current.position.z += direction[2] * delta * speed;

    // Gentle floating sway
    const sway = Math.sin(state.clock.elapsedTime + randomOffset) * 0.01;
    ref.current.position.x += (direction[1] !== 0 ? sway : 0);
    ref.current.position.y += (direction[0] !== 0 ? sway : 0);

    // Reset to opposite side if it goes out of bounds
    const limitX = 15;
    const limitY = 12;
    if (ref.current.position.x > limitX) ref.current.position.x = -limitX;
    if (ref.current.position.x < -limitX) ref.current.position.x = limitX;
    if (ref.current.position.y > limitY) ref.current.position.y = -limitY;
    if (ref.current.position.y < -limitY) ref.current.position.y = limitY;
    if (ref.current.position.z > 10) ref.current.position.z = -15;
    if (ref.current.position.z < -15) ref.current.position.z = 10;
  });

  return (
    <group ref={ref} position={startPosition} scale={scale}>
      <RoundedBox args={[3.8, 1.2, 0.2]} radius={0.15} smoothness={isMobile ? 2 : 4}>
        <meshPhysicalMaterial 
          color={color} 
          roughness={0.1} 
          metalness={0.2} 
          transmission={0.5} 
          thickness={0.5}
          clearcoat={1}
        />
      </RoundedBox>
      {/* Bubble Tail */}
      <RoundedBox args={[0.7, 0.7, 0.18]} radius={0.1} position={[-1.4, -0.5, 0]} rotation={[0, 0, Math.PI / 4]} smoothness={isMobile ? 2 : 4}>
        <meshPhysicalMaterial 
          color={color} 
          roughness={0.1} 
          metalness={0.2} 
          transmission={0.5} 
          thickness={0.5}
          clearcoat={1}
        />
      </RoundedBox>
      {/* Message Text */}
      <Text 
        position={[0, 0, 0.15]} 
        fontSize={0.3} 
        color="white" 
        anchorX="center" 
        anchorY="middle" 
        maxWidth={3.5}
        font="https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSansMalayalam/NotoSansMalayalam-Regular.ttf"
      >
        {text}
      </Text>
    </group>
  );
}

function FloatingChatScene() {
  const { viewport } = useThree();
  const isMobile = viewport.width < 8;
  const responsiveScale = isMobile ? 0.45 : 1;

  const bubbles = useMemo(() => [
    { pos: [-10, -4, -2], color: '#8b5cf6', text: 'ചോറ് തിന്നോ? 🍚', speed: 1.5, scale: 0.8, dir: [1, 0.3, 0] },
    { pos: [8, 6, -4], color: '#f43f5e', text: 'അളിയാ സീൻ ആണ് 🏃‍♂️', speed: 1.2, scale: 1, dir: [-1, -0.5, 0.5] },
    { pos: [-2, -10, -1], color: '#3b82f6', text: 'നീയൊക്കെ എവിടെയാടാ? 🧐', speed: 1.8, scale: 0.9, dir: [0.2, 1, 0] },
    { pos: [10, -2, -5], color: '#22c55e', text: 'കറൻ്റ് പോയി 😭', speed: 1.4, scale: 0.7, dir: [-1, 0.1, 1] },
    { pos: [2, 10, -3], color: '#eab308', text: 'നാളെ ലീവ് ആണോ? 🛌', speed: 1.0, scale: 0.85, dir: [-0.3, -1, 0] },
    { pos: [-8, 8, -6], color: '#ec4899', text: 'സിനിമക്ക് പോവാം 🍿', speed: 1.6, scale: 0.95, dir: [1, -0.6, 0.2] },
    { pos: [-6, -12, -8], color: '#14b8a6', text: 'ഒന്ന് വേഗം വാ ⏳', speed: 1.3, scale: 0.75, dir: [0.8, 0.8, 0.5] },
    { pos: [6, -8, 2], color: '#f97316', text: 'റിപ്ലൈ താടോ 😡', speed: 1.7, scale: 0.88, dir: [-0.6, 1.2, -0.2] },
    { pos: [0, -14, -4], color: '#6366f1', text: 'പൈസ ഇല്ല ബ്രോ 💸', speed: 1.1, scale: 0.9, dir: [0, 1.5, -0.5] },
  ], []);

  return (
    <>
      <Stars radius={100} depth={50} count={isMobile ? 150 : 400} factor={4} saturation={0} fade speed={1} />
      {bubbles.map((b, i) => (
        <ChatBubble key={i} startPosition={b.pos} color={b.color} text={b.text} speed={b.speed} scale={b.scale * responsiveScale} direction={b.dir} isMobile={isMobile} />
      ))}
    </>
  );
}

function ThreeBackground() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <Canvas 
      camera={{ position: [0, 0, 10], fov: isMobile ? 65 : 45 }} 
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
    >
      <color attach="background" args={['#1c1512']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} color="#fcd34d" />
      <directionalLight position={[-5, -5, -5]} intensity={1} color="#ea580c" />
      <spotLight position={[0, 10, 0]} intensity={1} angle={0.3} penumbra={1} color="#ffffff" />
      
      <Environment preset="city" />
      
      <Suspense fallback={null}>
        <FloatingChatScene />
      </Suspense>
      
      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.3} minPolarAngle={Math.PI / 2 - 0.3} />
    </Canvas>
  );
}

function Landing({ onJoin, onCreate }) {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [roomType, setRoomType] = useState('private');
  
  return (
    <div className="landing-card glass-panel">
      <div className="logo-container" style={{ animation: 'glow-pulse 2s infinite alternate' }}>
        <Coffee size={40} color="var(--accent)" />
      </div>
      <h1 className="landing-title neon-text">Chayakada</h1>
      <p className="landing-description">
        കൂട്ടുകാരുമായി സൊറ പറയാൻ നമ്മുടെ സ്വന്തം ഡിജിറ്റൽ ചായക്കട.<br/>കയറി വാ മക്കളേ, തകർക്കാം! ☕
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Enter Your Name..." 
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <select 
          className="input-field" 
          value={roomType}
          onChange={(e) => setRoomType(e.target.value)}
          style={{ appearance: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.6)' }}
        >
          <option value="private">Private Chayakada (Max 2 Persons)</option>
          <option value="group">Group Chayakada (Multiple)</option>
        </select>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        <button className="btn" onClick={() => onCreate(userName, roomType)}>
          <Plus size={18} />
          Create New Room
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>OR JOIN</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Room Code..." 
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button className="btn btn-outline" onClick={() => onJoin(userName, roomId)}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatRoom({ roomId, onLeave, userContext, showToast, socket }) {
  const [messages, setMessages] = useState([
    { id: 1, text: `ചായക്കട തുറന്നു! ${userContext.roomType === 'private' ? '(Private Room - 2 Max)' : '(Group Room)'}`, sender: 'system', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [participants, setParticipants] = useState(userContext.initialMembers || [{ userName: userContext.userName, isHost: userContext.isHost, socketId: 'self' }]);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [participantMuteStates, setParticipantMuteStates] = useState({}); // { [socketId]: boolean }
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const isLongPressRef = useRef(false);
  const isPendingStopRef = useRef(false);
  const originalMicStateRef = useRef(true);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const localScreenRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [expandedVideo, setExpandedVideo] = useState(null); // { type: 'local'|'remote'|'screen', id?: string, stream: MediaStream, name: string }

  const localStreamRef = useRef(new MediaStream());
  const peerRef = useRef(null);
  const callsRef = useRef({}); // { [socketId]: call }

  // Helper to sync persistent localStreamRef with individual refs
  const syncLocalStream = () => {
    const mainStream = localStreamRef.current;
    // Remove old tracks
    mainStream.getTracks().forEach(track => mainStream.removeTrack(track));
    // Add current tracks
    if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => mainStream.addTrack(t));
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => mainStream.addTrack(t));
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join-room', { roomId, userName: userContext.userName });
    };

    socket.on('connect', onConnect);
    if (socket.connected) onConnect(); // Handle case where socket is already connected

    socket.on('new-message', (msg) => {
      console.log('✉️ New message received:', msg);
      // Diagnostic toast to confirm event delivery
      if (msg.sender !== socket.id) {
        showToast(`Message from ${msg.senderName}`, 'success');
      }
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, {
          ...msg,
          sender: msg.sender === socket.id ? 'own' : 'other'
        }];
      });
    });

    socket.on('join-success', (state) => {
      console.log('✅ Joined room successfully:', state);
      if (state?.members) setParticipants(state.members);
    });

    socket.on('system-message', (msg) => {
      console.log('📢 System message:', msg);
      setMessages(prev => [...prev, { ...msg, id: Date.now(), sender: 'system' }]);
    });

    socket.on('mute-status-update', ({ socketId, isMuted }) => {
      setParticipantMuteStates(prev => ({ ...prev, [socketId]: isMuted }));
    });

    socket.on('room-update', (state) => {
      console.log('🏘️ Room update received:', state);
      if (state?.members) {
        setParticipants(state.members);
        // Cleanup remote streams for users who left
        const activeIds = state.members.map(m => m.socketId);
        setRemoteStreams(prev => {
          const next = {};
          activeIds.forEach(id => { if (prev[id]) next[id] = prev[id]; });
          return next;
        });
      }
    });

    socket.on('user-joined', ({ socketId, userName }) => {
      console.log(`👤 User joined: ${userName} (${socketId})`);
      syncLocalStream();
      if (localStreamRef.current.getTracks().length > 0 && peerRef.current) {
        console.log(`📞 Calling ${userName}...`);
        const call = peerRef.current.call(socketId, localStreamRef.current);
        callsRef.current[socketId] = call;
        
        call.on('stream', (remoteStream) => {
          setRemoteStreams(prev => ({ ...prev, [socketId]: remoteStream }));
        });
        
        call.on('close', () => {
          delete callsRef.current[socketId];
          setRemoteStreams(prev => {
            const next = { ...prev };
            delete next[socketId];
            return next;
          });
        });
      }
    });

    socket.on('user-typing', ({ userName, socketId }) => {
      setTypingUsers(prev => ({ ...prev, [socketId]: userName }));
    });

    socket.on('user-stop-typing', ({ socketId }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    socket.on('error', ({ message }) => {
      showToast(message, 'error');
    });

    // Initialize PeerJS with STUN servers
    const peer = new Peer(socket.id, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ]
      }
    });
    peerRef.current = peer;

    peer.on('open', (id) => console.log('🆔 PeerJS connected with ID:', id));
    peer.on('error', (err) => {
      console.error('❌ PeerJS Error:', err);
      if (err.type === 'peer-unavailable') {
        showToast('Participant is temporarily unavailable.', 'error');
      }
    });

    peer.on('call', (call) => {
      console.log('📞 Incoming call from:', call.peer);
      syncLocalStream();
      // Close existing call if any
      if (callsRef.current[call.peer]) {
        callsRef.current[call.peer].close();
      }
      
      call.answer(localStreamRef.current);
      callsRef.current[call.peer] = call;
      
      call.on('stream', (remoteStream) => {
        console.log('🎬 Remote stream received from:', call.peer);
        setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
      });

      call.on('close', () => {
        console.log('📵 Call closed by:', call.peer);
        delete callsRef.current[call.peer];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[call.peer];
          return next;
        });
      });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('new-message');
      socket.off('join-success');
      socket.off('system-message');
      socket.off('room-update');
      socket.off('user-joined');
      socket.off('user-typing');
      socket.off('user-stop-typing');
      socket.off('error');
      socket.off('mute-status-update');
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [socket, roomId, userContext.userName]);

  // When local stream toggles, tell others to call again
  useEffect(() => {
    if (socket && (isVideoActive || isMicActive)) {
      socket.emit('refresh-webrtc', { roomId });
    }
  }, [isVideoActive, isMicActive]);

  const toggleVideo = async () => {
    if (!isVideoActive) {
      try {
        const constraints = { 
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        syncLocalStream();
        setIsVideoActive(true);
        if (socket) socket.emit('refresh-webrtc', { roomId });
      } catch (err) {
        console.error("Camera access denied", err);
        showToast("Could not access the camera. Please allow permissions.", "error");
        setIsVideoActive(false);
      }
    } else {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      syncLocalStream();
      setIsVideoActive(false);
      if (socket) socket.emit('refresh-webrtc', { roomId });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Manage Audio Stream independently
  useEffect(() => {
    if (isMicActive) {
      if (!audioStreamRef.current) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            audioStreamRef.current = stream;
            syncLocalStream();
            if (socket) {
              socket.emit('refresh-webrtc', { roomId });
              socket.emit('toggle-mute', { roomId, isMuted: false });
            }
          })
          .catch(err => {
            console.error("Microphone access denied", err);
            showToast("Could not access the microphone. Please allow permissions.", "error");
            setIsMicActive(false);
          });
      } else {
        audioStreamRef.current.getAudioTracks().forEach(track => { track.enabled = true; });
        if (socket) socket.emit('toggle-mute', { roomId, isMuted: false });
      }
    } else if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
      if (socket) socket.emit('toggle-mute', { roomId, isMuted: true });
    }
  }, [isMicActive]);

  // Manage Screen Share independently
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => { setIsScreenSharing(false); screenStreamRef.current = null; };
      } catch (err) {
        console.error("Screen share access denied", err);
        showToast("Screen share cancelled or denied.", "error");
      }
    }
  };

  useEffect(() => {
    if (isScreenSharing && localScreenRef.current && screenStreamRef.current) {
      localScreenRef.current.srcObject = screenStreamRef.current;
    }
  }, [isScreenSharing]);

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      isPendingStopRef.current = false;
      originalMicStateRef.current = isMicActive;
      
      // Physically ensure mic is enabled for recording
      let stream = audioStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        syncLocalStream();
      }
      
      stream.getAudioTracks().forEach(t => t.enabled = true);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Restore previous mic state
        setIsMicActive(originalMicStateRef.current);
        if (audioStreamRef.current) {
          audioStreamRef.current.getAudioTracks().forEach(t => t.enabled = originalMicStateRef.current);
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) return; // Ignore tiny/empty recordings

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result;
          if (socket) {
            socket.emit('send-message', { roomId, text: base64Audio, id: Date.now() });
          }
        };
      };

      mediaRecorder.start();
      setIsMicActive(true); // Temporarily unmute for UI feedback and recording
      setIsRecording(true);
      setRecordingTime(0);
      
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // If user already released during start-up race
      if (isPendingStopRef.current) {
        stopRecording();
      }
    } catch (err) {
      console.error("Recording failed", err);
      showToast("Could not start recording.", "error");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      isPendingStopRef.current = false;
    } else {
      // If we haven't started yet but stop was requested
      isPendingStopRef.current = true;
    }
  };

  const handleMicMouseDown = (e) => {
    if (e.type === 'touchstart') e.preventDefault();
    isLongPressRef.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startRecording();
    }, 500);
  };

  const handleMicMouseUp = (e) => {
    if (e.type === 'touchend') e.preventDefault();
    clearTimeout(longPressTimeoutRef.current);
    if (isLongPressRef.current) {
      stopRecording();
    } else {
      setIsMicActive(prev => !prev);
    }
  };

  // Cleanup all streams on leave
  useEffect(() => {
    return () => {
      [videoStreamRef, audioStreamRef, screenStreamRef].forEach(ref => {
        if (ref.current) ref.current.getTracks().forEach(t => t.stop());
      });
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, []);

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    
    const messageId = `${socket?.id || 'offline'}-${Date.now()}`;
    const messageData = {
      id: messageId,
      text: inputMsg,
      sender: socket?.id || 'offline',
      senderName: userContext.userName,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    console.log(`📤 Sending message to room ${roomId}:`, messageData);
    
    // Optimistic update
    setMessages(prev => [...prev, { ...messageData, sender: 'own' }]);

    if (socket && socket.connected) {
      socket.emit('send-message', { roomId, text: inputMsg, id: messageData.id });
      socket.emit('stop-typing', { roomId });
    } else {
      showToast('You are offline. Message saved locally.', 'success');
    }
    setInputMsg('');
  };

  const handleTyping = (e) => {
    setInputMsg(e.target.value);
    if (socket && socket.connected) {
      socket.emit('typing', { roomId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { roomId });
      }, 2000);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(roomId);
    showToast('Room ID copied! Share it with your friend ☕', 'success');
  };

  return (
    <div className="chat-layout">
      {/* Mobile Header */}
      <div className="mobile-header glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Coffee size={20} color="var(--primary)" />
          <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>CHAYAKADA</span>
        </div>
        <button className="icon-btn" onClick={() => setShowSidebar(!showSidebar)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(217, 119, 6, 0.1)', borderRadius: '10px' }}>
          <Users size={18} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>Members</span>
          {participants.length > 1 && <span className="notification-dot"></span>}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`glass-panel sidebar ${showSidebar ? 'show' : ''}`}>
        <div className="sidebar-mobile-close">
           <button className="icon-btn" onClick={() => setShowSidebar(false)}>✕</button>
        </div>

        <div className="sidebar-branding" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--primary-glow)' }}>
            <Coffee size={20} color="white" />
          </div>
          <h2 className="sidebar-title neon-text" style={{ fontSize: '1.4rem' }}>Chayakada</h2>
        </div>
        
        <div className="sidebar-invite" style={{ marginBottom: '32px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Invite Others</p>
          <div className="room-id-badge">
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--primary)' }}>{roomId}</span>
            <button onClick={copyInviteLink} className="icon-btn" style={{ padding: '8px' }} title="Copy Room ID">
              <Copy size={16} />
            </button>
          </div>
        </div>

        <div className="participant-section" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Participants ({participants.length}{userContext.roomType === 'private' ? ' / 2' : ''})</p>
            <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>Online</span>
          </div>
          {participants.map((p, i) => (
            <div className="participant-item" key={i}>
              <div className="avatar">{p.userName.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.userName} {p.userName === userContext.userName ? '(You)' : ''}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.isHost ? 'Admin' : 'Guest'}</p>
              </div>
              <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 6px #22c55e', display: 'inline-block' }}></span>
            </div>
          ))}
        </div>

        <button className="btn" onClick={onLeave} style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent)', border: '1px solid rgba(244, 63, 94, 0.3)', boxShadow: 'none' }}>
          <PhoneOff size={18} />
          Leave Chayakada
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="glass-panel main-chat">
        {/* Video Grid */}
        {(isVideoActive || isScreenSharing || Object.keys(remoteStreams).length > 0) && (
          <div className={`video-grid-container ${Object.keys(remoteStreams).length > 1 ? 'multi-view' : ''}`}>
            {/* Show local card only if video/screen is active, or if we are in a multi-user call */}
            {(isVideoActive || isScreenSharing || Object.keys(remoteStreams).length > 0) && (isVideoActive || isScreenSharing) && (
              <div className="video-card" onClick={() => setExpandedVideo({ type: 'local', stream: videoStreamRef.current || audioStreamRef.current, name: `${userContext.userName} (You)` })}>
                <RemoteVideo 
                  stream={videoStreamRef.current || audioStreamRef.current} 
                  userName={userContext.userName} 
                  isMuted={!isMicActive}
                />
                <div className="video-label">
                  <span style={{ width: '8px', height: '8px', background: isVideoActive ? '#22c55e' : '#f59e0b', borderRadius: '50%', boxShadow: `0 0 10px ${isVideoActive ? '#22c55e' : '#f59e0b'}` }}></span>
                  {userContext.userName} (You)
                </div>
              </div>
            )}

            {Object.entries(remoteStreams).map(([peerId, stream]) => {
              const participant = participants.find(p => p.socketId === peerId);
              const isRemoteMuted = participantMuteStates[peerId] || false;
              
              return (
                <div className="video-card" key={peerId} onClick={() => setExpandedVideo({ type: 'remote', id: peerId, stream, name: participant?.userName || 'Guest' })}>
                  <RemoteVideo 
                    stream={stream} 
                    userName={participant?.userName} 
                    isMuted={isRemoteMuted}
                  />
                  <div className="video-label">
                    <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }}></span>
                    {participant?.userName || 'Guest'}
                  </div>
                </div>
              );
            })}
            
            {isScreenSharing && (
              <div className="video-card" onClick={() => setExpandedVideo({ type: 'screen', stream: screenStreamRef.current, name: `${userContext.userName} (Screen)` })}>
                <video 
                  ref={localScreenRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                />
                <div className="video-label">
                  <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 10px #3b82f6' }}></span>
                  {userContext.userName} (Screen)
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expanded Video Overlay */}
        {expandedVideo && (
          <div className="expanded-video-overlay" onClick={() => setExpandedVideo(null)}>
            <div className="expanded-video-container" onClick={e => e.stopPropagation()}>
              <button className="close-expanded" onClick={() => setExpandedVideo(null)}>✕</button>
              <RemoteVideo stream={expandedVideo.stream} userName={expandedVideo.name} />
              <div className="video-label expanded-label">
                <span style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 12px #22c55e' }}></span>
                {expandedVideo.name}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="messages-area">
          {messages.map(msg => (
            msg.sender === 'system' ? (
              <div key={msg.id} className="system-message">
                {msg.text}
              </div>
            ) : (
              <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                <div className="message-bubble">
                  {msg.text.startsWith('data:audio/') ? (
                    <div className="audio-msg">
                      <audio src={msg.text} controls style={{ maxWidth: '200px', height: '35px' }} />
                    </div>
                  ) : msg.text}
                </div>
                <div className="message-time">{msg.time}</div>
              </div>
            )
          ))}
          {Object.values(typingUsers).length > 0 && (
            <div className="typing-indicator" style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--primary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="typing-dots"><span></span><span></span><span></span></div>
              {Object.values(typingUsers).join(', ')} is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="message-input-area">
          <div className="controls-group">
            <button 
              className={`icon-btn ${!isVideoActive ? 'active-red' : ''}`} 
              onClick={toggleVideo}
              onTouchEnd={(e) => { e.preventDefault(); toggleVideo(); }}
              title={isVideoActive ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoActive ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button 
              className={`icon-btn ${!isMicActive ? 'active-red' : ''} ${isRecording ? 'recording-pulse' : ''}`} 
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onTouchStart={handleMicMouseDown}
              onTouchEnd={handleMicMouseUp}
              title={isRecording ? "Release to send" : (isMicActive ? "Mute / Hold to record" : "Unmute / Hold to record")}
              style={{ position: 'relative' }}
            >
              {isRecording ? <Mic size={20} color="#ef4444" /> : (isMicActive ? <Mic size={20} /> : <MicOff size={20} />)}
              {isRecording && <span className="recording-timer">{recordingTime}s</span>}
            </button>
            <button 
              className={`icon-btn ${isScreenSharing ? 'active-green' : ''}`} 
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            >
              <MonitorUp size={20} color={isScreenSharing ? "#22c55e" : "currentColor"} />
            </button>
          </div>
          
          <input 
            type="text" 
            className="input-field" 
            placeholder="Type a message..." 
            value={inputMsg}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ flex: 1, margin: '0 8px' }}
          />
          
          <button className="btn" onClick={handleSend} style={{ padding: '14px', borderRadius: '50%' }}>
            <Send size={20} style={{ transform: 'translateX(-2px) translateY(2px)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo-container">
          <Coffee size={60} color="var(--accent)" className="loading-icon" />
          <div className="loading-steam"></div>
        </div>
        <h1 className="loading-text neon-text">Chayakada</h1>
        <div className="loading-bar-container">
          <div className="loading-bar-progress"></div>
        </div>
        <p className="loading-subtext">അടുപ്പ് കൂട്ടുന്നു... ചായ ഉടൻ റെഡിയാകും!</p>
      </div>
    </div>
  );
}

export default function App() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const [currentRoom, setCurrentRoom] = useState(() => sessionStorage.getItem('chayakada_room') || null);
  const [userContext, setUserContext] = useState(() => {
    const saved = sessionStorage.getItem('chayakada_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Initialize socket once
  useEffect(() => {
    console.log('☕ Chayakada attempting connection to:', SOCKET_URL || 'OFFLINE_MODE');
    if (!SOCKET_URL) return;

    const socket = io(SOCKET_URL, { 
      autoConnect: false,
      reconnectionAttempts: 3,
      timeout: 10000
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('connect_error', () => {
      setTimeout(() => {
        if (!socket.connected) {
          showToast('Server is waking up... ☕ Please wait a moment.', 'success');
        }
      }, 2000);
    });
    socket.on('error', ({ message }) => showToast(message, 'error'));

    socket.connect();

    const savedRoom = sessionStorage.getItem('chayakada_room');
    const savedUser = sessionStorage.getItem('chayakada_user');
    if (savedRoom && savedUser) {
      const user = JSON.parse(savedUser);
      socket.once('connect', () => {
        socket.emit('join-room', { roomId: savedRoom, userName: user.userName });
      });
    }

    return () => socket.disconnect();
  }, []);

  const handleCreateRoom = (userName, roomType) => {
    if (!userName.trim()) return showToast('Please enter your name before creating a room.', 'error');
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const context = { userName, roomType, isHost: true };

    if (socketRef.current?.connected) {
      socketRef.current.emit('create-room', { roomId: newId, userName, roomType });
      socketRef.current.once('room-created', () => {
        sessionStorage.setItem('chayakada_room', newId);
        sessionStorage.setItem('chayakada_user', JSON.stringify(context));
        setUserContext(context);
        setCurrentRoom(newId);
      });
    } else {
      sessionStorage.setItem('chayakada_room', newId);
      sessionStorage.setItem('chayakada_user', JSON.stringify(context));
      setUserContext(context);
      setCurrentRoom(newId);
    }
  };

  const handleJoinRoom = (userName, id) => {
    if (!userName.trim()) return showToast('Please enter your name before joining.', 'error');
    if (!id.trim()) return showToast('Please enter a room code.', 'error');

    const normalizedId = id.trim().toUpperCase();
    if (normalizedId.length !== 6 || !/^[A-Z0-9]{6}$/.test(normalizedId)) {
      return showToast('Wrong Room ID! The code must be exactly 6 letters/numbers.', 'error');
    }

    const context = { userName, roomType: 'private', isHost: false };

    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', { roomId: normalizedId, userName });

      const onJoinSuccess = (state) => {
        sessionStorage.setItem('chayakada_room', normalizedId);
        sessionStorage.setItem('chayakada_user', JSON.stringify(context));
        setUserContext({ ...context, initialMembers: state.members });
        setCurrentRoom(normalizedId);
        socketRef.current.off('error', onError);
      };
      const onError = ({ message }) => {
        showToast(message, 'error');
        socketRef.current.off('join-success', onJoinSuccess);
      };
      socketRef.current.once('join-success', onJoinSuccess);
      socketRef.current.once('error', onError);
    } else {
      sessionStorage.setItem('chayakada_room', normalizedId);
      sessionStorage.setItem('chayakada_user', JSON.stringify(context));
      setUserContext(context);
      setCurrentRoom(normalizedId);
    }
  };

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
    }
    sessionStorage.removeItem('chayakada_room');
    sessionStorage.removeItem('chayakada_user');
    setCurrentRoom(null);
    setUserContext(null);
  };

  return (
    <div className="app-container">
      <div className="canvas-container">
        <ThreeBackground />
      </div>
      
      <div className="ui-layer">
        {isLoading ? (
          <LoadingScreen />
        ) : !currentRoom ? (
          <Landing onJoin={handleJoinRoom} onCreate={handleCreateRoom} />
        ) : (
          <ChatRoom 
            roomId={currentRoom} 
            userContext={userContext} 
            onLeave={handleLeaveRoom} 
            showToast={showToast}
            socket={socketRef.current}
          />
        )}
      </div>

      {toast.show && (
        <div className={`custom-toast ${toast.type}`}>
          <p style={{ margin: 0 }}>{toast.message}</p>
          <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="toast-close">×</button>
        </div>
      )}
    </div>
  );
}

