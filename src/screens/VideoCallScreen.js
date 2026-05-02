import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { sendMessage, subscribeToMessages } from '../services/chatService';

const VideoCallScreen = ({ route }) => {
    const { friend, isCaller = true, chatId } = route.params;
    const { user } = useAuth();
    const navigation = useNavigation();
    const webViewRef = useRef(null);
    const isConnected = useRef(false);
    const timeoutRef = useRef(null);
    const hasSentMessage = useRef(false);

    const actualChatId = chatId || [user.uid, friend.id].sort().join('_');

    const avatarUrl = friend.avatar || '';
    const friendName = friend.fullName || 'Người dùng';
    const firstLetter = friendName.trim()[0]?.toUpperCase() || '?';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html, body { height:100%; overflow:hidden; }
  body {
    height:100vh;
    background: linear-gradient(175deg, #5AC8FA 0%, #2EA5DC 45%, #1A85C4 100%);
    font-family: -apple-system, 'Helvetica Neue', sans-serif;
    color: #fff;
    display: flex;
    flex-direction: column;
    user-select: none;
  }

  /* ── TOP BAR ── */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 56px 20px 12px;
  }
  .icon-btn {
    width: 44px; height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .app-title { font-size: 18px; font-weight: 600; letter-spacing: 0.2px; }

  /* ── AVATAR SECTION ── */
  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 24px;
  }
  .glow-outer {
    width: 164px; height: 164px; border-radius: 50%;
    background: rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    animation: pulse 2.4s ease-in-out infinite;
  }
  .glow-inner {
    width: 140px; height: 140px; border-radius: 50%;
    background: rgba(255,255,255,0.28);
    display: flex; align-items: center; justify-content: center;
  }
  .avatar-circle {
    width: 118px; height: 118px; border-radius: 50%;
    overflow: hidden; background: #1a3a5c;
    display: flex; align-items: center; justify-content: center;
    font-size: 46px; font-weight: 700; color: #fff;
  }
  .avatar-circle img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  @keyframes pulse {
    0%,100% { transform: scale(1);   opacity: 1; }
    50%      { transform: scale(1.06); opacity: 0.85; }
  }

  .friend-name {
    font-size: 30px; font-weight: 700;
    margin-top: 22px;
    text-shadow: 0 1px 6px rgba(0,0,0,0.18);
    letter-spacing: 0.3px;
  }
  .status-text {
    font-size: 15px;
    color: rgba(255,255,255,0.88);
    margin-top: 8px;
    font-weight: 400;
  }

  /* ── MIDDLE DECORATION ── */
  .deco {
    flex: 1;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    pointer-events: none;
  }
  .deco svg { width: 100%; display: block; }

  /* ── BOTTOM BAR ── */
  .bottom-bar {
    padding: 20px 0 44px;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255,255,255,0.12);
  }
  .controls {
    display: flex;
    justify-content: space-evenly;
    align-items: flex-start;
    padding: 0 16px;
  }
  .ctrl-wrap {
    display: flex; flex-direction: column;
    align-items: center; gap: 8px;
  }
  .ctrl-btn {
    width: 62px; height: 62px; border-radius: 50%;
    background: rgba(0,0,0,0.22);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
  }
  .ctrl-btn.active { background: rgba(255,255,255,0.35); }
  .ctrl-btn.end-call {
    width: 70px; height: 70px;
    background: #FF3B30;
    box-shadow: 0 4px 20px rgba(255,59,48,0.5);
  }
  .ctrl-label {
    font-size: 12px; color: rgba(255,255,255,0.88);
    font-weight: 500;
  }
  svg.icon { width: 26px; height: 26px; fill: #fff; }
  svg.icon-lg { width: 30px; height: 30px; fill: #fff; }

  .error-msg {
    color: #FFD60A; font-size: 13px; text-align: center;
    padding: 6px 20px; display: none;
  }
</style>
</head>
<body>

<!-- TOP -->
<div class="top-bar">
  <button class="icon-btn" onclick="hangup()">
    <svg class="icon" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
  </button>
  <span class="app-title">Messta</span>
  <div class="icon-btn" style="opacity:0.5; cursor:default;">
    <svg class="icon" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
  </div>
</div>

<!-- AVATAR -->
<div class="avatar-section">
  <div class="glow-outer">
    <div class="glow-inner">
      <div class="avatar-circle" id="avatar-wrap">
        ${avatarUrl
            ? `<img src="${avatarUrl}" onerror="this.parentNode.innerHTML='${firstLetter}'" />`
            : firstLetter
        }
      </div>
    </div>
  </div>
  <div class="friend-name">${friendName}</div>
  <div class="status-text" id="status">Đang kết nối...</div>
  <div class="error-msg" id="error-msg"></div>
</div>

<!-- DECORATION -->
<div class="deco">
  <svg viewBox="0 0 390 140" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.22">
      <!-- simple city skyline -->
      <rect x="10" y="80" width="30" height="60" rx="3" fill="#fff"/>
      <rect x="20" y="60" width="10" height="20" fill="#fff"/>
      <rect x="50" y="55" width="40" height="85" rx="3" fill="#fff"/>
      <rect x="65" y="38" width="10" height="20" fill="#fff"/>
      <rect x="100" y="70" width="25" height="70" rx="3" fill="#fff"/>
      <rect x="135" y="45" width="50" height="95" rx="3" fill="#fff"/>
      <rect x="155" y="28" width="10" height="20" fill="#fff"/>
      <rect x="195" y="62" width="35" height="78" rx="3" fill="#fff"/>
      <rect x="240" y="50" width="45" height="90" rx="3" fill="#fff"/>
      <rect x="257" y="32" width="11" height="22" fill="#fff"/>
      <rect x="295" y="72" width="28" height="68" rx="3" fill="#fff"/>
      <rect x="333" y="48" width="40" height="92" rx="3" fill="#fff"/>
      <rect x="348" y="30" width="10" height="20" fill="#fff"/>
    </g>
    <!-- ground wave -->
    <path d="M0,110 Q60,90 120,110 Q180,130 240,110 Q300,90 390,110 L390,140 L0,140 Z" fill="rgba(255,255,255,0.1)"/>
    <path d="M0,125 Q80,108 160,125 Q240,140 320,120 Q360,112 390,125 L390,140 L0,140 Z" fill="rgba(255,255,255,0.07)"/>
  </svg>
</div>

<!-- CONTROLS -->
<div class="bottom-bar">
  <div class="controls">
    <!-- Loa -->
    <div class="ctrl-wrap">
      <button class="ctrl-btn" id="speaker-btn" onclick="toggleSpeaker()">
        <svg class="icon" viewBox="0 0 24 24">
          <path id="speaker-icon" d="M3 9v6h4l5 5V4L7 9H3zm16.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
      </button>
      <span class="ctrl-label">Loa</span>
    </div>

    <!-- Kết thúc -->
    <div class="ctrl-wrap">
      <button class="ctrl-btn end-call" onclick="hangup()">
        <svg class="icon-lg" viewBox="0 0 24 24">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" transform="rotate(135 12 12)"/>
        </svg>
      </button>
      <span class="ctrl-label">Kết thúc</span>
    </div>

    <!-- Mic -->
    <div class="ctrl-wrap">
      <button class="ctrl-btn" id="mic-btn" onclick="toggleMic()">
        <svg class="icon" viewBox="0 0 24 24">
          <path id="mic-icon" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
        </svg>
      </button>
      <span class="ctrl-label">Mic</span>
    </div>
  </div>
</div>

<script>
  const myId    = "${user.uid}";
  const friendId = "${friend.id}";
  const isCaller = ${isCaller};

  const statusEl  = document.getElementById('status');
  const errorEl   = document.getElementById('error-msg');
  const micBtn    = document.getElementById('mic-btn');
  const speakerBtn = document.getElementById('speaker-btn');

  let localStream = null;
  let micOn = true;
  let speakerOn = true;
  let connected = false;

  // ── PeerJS ──
  const peer = new Peer(myId, {
    config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]}
  });

  peer.on('open', () => {
    statusEl.innerText = isCaller ? 'Đang đổ chuông...' : 'Đang kết nối...';
    startMedia();
  });

  function startMedia() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      localStream = stream;
      if (isCaller) {
        callWithRetry(stream);
      }
    })
    .catch(() => {
      showError('Không thể dùng Mic. Hãy cấp quyền và thử lại.');
    });
  }

  // Receiver: lắng nghe cuộc gọi đến
  peer.on('call', (call) => {
    if (!localStream) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => { localStream = stream; answerCall(call); });
    } else {
      answerCall(call);
    }
  });

  function answerCall(call) {
    call.answer(localStream);
    bindCallEvents(call);
  }

  function callWithRetry(stream, attempt = 1) {
    if (connected) return;
    if (attempt > 15) {
      showError('Không tìm thấy đối phương. Thử lại sau.');
      return;
    }
    const call = peer.call(friendId, stream);
    if (call) bindCallEvents(call);
    setTimeout(() => { if (!connected) callWithRetry(stream, attempt + 1); }, 3000);
  }

  function bindCallEvents(call) {
    call.on('stream', (remoteStream) => {
      if (connected) return;
      connected = true;
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      document.body.appendChild(audio);
      statusEl.innerText = 'Đã kết nối';
      statusEl.style.color = '#A8FF78';
      window.ReactNativeWebView.postMessage('CONNECTED');
    });
    call.on('close', () => { statusEl.innerText = 'Cuộc gọi kết thúc'; });
  }

  // ── CONTROLS ──
  function hangup() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    window.ReactNativeWebView.postMessage('HANGUP');
  }

  function toggleMic() {
    micOn = !micOn;
    if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = micOn);
    micBtn.classList.toggle('active', !micOn);
    micBtn.style.background = micOn ? '' : 'rgba(255,255,255,0.38)';
    // đổi icon mic sang muted khi tắt
    document.getElementById('mic-icon').setAttribute('d', micOn
      ? 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z'
      : 'M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z'
    );
  }

  function toggleSpeaker() {
    speakerOn = !speakerOn;
    speakerBtn.style.background = speakerOn ? '' : 'rgba(255,255,255,0.38)';
  }

  function showError(msg) {
    errorEl.innerText = msg;
    errorEl.style.display = 'block';
  }

  peer.on('error', (err) => { showError('Lỗi kết nối: ' + err.type); });
</script>
</body>
</html>`;

    const onMessage = async (event) => {
        const msg = event.nativeEvent.data;
        if (msg === 'HANGUP') {
            if (!hasSentMessage.current) {
                hasSentMessage.current = true;
                const text = isConnected.current 
                    ? '📞 Cuộc gọi kết thúc' 
                    : (isCaller ? '📞 Cuộc gọi nhỡ' : '📞 Cuộc gọi kết thúc');
                await sendMessage(actualChatId, text, [], user.uid);
            }
            navigation.goBack();
        } else if (msg === 'CONNECTED') {
            isConnected.current = true;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
    };

    useEffect(() => {
        if (isCaller) {
            timeoutRef.current = setTimeout(async () => {
                if (!isConnected.current) {
                    if (!hasSentMessage.current) {
                        hasSentMessage.current = true;
                        await sendMessage(actualChatId, '📞 Cuộc gọi nhỡ', [], user.uid);
                    }
                    if (webViewRef.current) {
                        webViewRef.current.injectJavaScript('hangup(); true;');
                    } else {
                        navigation.goBack();
                    }
                }
            }, 15000);
        }
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToMessages(actualChatId, (messages) => {
            if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                // Nếu đối phương gửi tin nhắn kết thúc/nhỡ/từ chối gần đây
                if (lastMsg.senderId === friend.id && 
                    (lastMsg.text === '📞 Cuộc gọi nhỡ' || lastMsg.text === '📞 Từ chối cuộc gọi' || lastMsg.text === '📞 Cuộc gọi kết thúc')) {
                    if (Date.now() - lastMsg.createdAt < 30000) {
                        hasSentMessage.current = true; // Không gửi lại tin nhắn nữa
                        if (webViewRef.current) {
                            webViewRef.current.injectJavaScript('hangup(); true;');
                        } else {
                            navigation.goBack();
                        }
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [actualChatId]);

    const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <WebView
                ref={webViewRef}
                source={{ html: htmlContent }}
                onMessage={onMessage}
                style={styles.webview}
                userAgent={userAgent}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mediaCapturePermissionGrantType="grant"
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                scrollEnabled={false}
                originWhitelist={['*']}
                allowsProtectedMedia={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#5AC8FA' },
    webview: { flex: 1, backgroundColor: '#5AC8FA' },
});

export default VideoCallScreen;
