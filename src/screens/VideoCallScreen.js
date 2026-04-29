import React, { useRef } from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const VideoCallScreen = ({ route }) => {
    const { friend, isCaller = true } = route.params;
    const { user } = useAuth();
    const navigation = useNavigation();
    const webViewRef = useRef(null);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
        <style>
            body { margin: 0; padding: 0; background: #121212; font-family: -apple-system, sans-serif; color: #fff; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: space-around; }
            .friend-name { font-size: 28px; font-weight: bold; margin-top: 60px; }
            .status { font-size: 16px; color: #0084FF; font-weight: 600; }
            .avatar { width: 180px; height: 180px; border-radius: 90px; border: 2px solid #1E1E1E; background: #222; overflow: hidden; }
            .avatar img { width: 100%; height: 100%; object-fit: cover; }
            .btn { border: none; border-radius: 40px; padding: 15px 40px; font-size: 18px; font-weight: bold; cursor: pointer; }
            .btn-start { background: #0084FF; color: #fff; margin-bottom: 15px; width: 220px; }
            .btn-cancel { background: #333; color: #ff3b30; border: 1px solid #ff3b30; width: 220px; }
            .btn-hangup { background: #FF3B30; color: #fff; padding: 20px; border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; }
            #controls { margin-bottom: 60px; display: flex; flex-direction: column; align-items: center; }
        </style>
    </head>
    <body>
        <div class="friend-name">${friend.fullName}</div>
        <div id="status" class="status">Sẵn sàng</div>
        
        <div class="avatar">
            <img src="${friend.avatar || 'https://via.placeholder.com/180'}" />
        </div>

        <div id="controls">
            <button id="main-btn" class="btn btn-start" onclick="initCall()">BẮT ĐẦU GỌI</button>
            <button id="cancel-btn" class="btn btn-cancel" onclick="window.ReactNativeWebView.postMessage('HANGUP')">HỦY / TẮT</button>
        </div>

        <script>
            const myId = "${user.uid}";
            const friendId = "${friend.id}";
            const isCaller = ${isCaller};
            const statusLabel = document.getElementById('status');
            const mainBtn = document.getElementById('main-btn');

            let peer = new Peer(myId, {
                config: {
                    'iceServers': [
                        { 'urls': 'stun:stun.l.google.com:19302' },
                        { 'urls': 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            function initCall() {
                mainBtn.innerText = "ĐANG KẾT NỐI...";
                mainBtn.disabled = true;
                statusLabel.innerText = "Đang khởi động Micro...";
                
                navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                .then(stream => {
                    if (isCaller) {
                        statusLabel.innerText = "Đang tìm đối phương...";
                        callWithRetry(stream);
                    }
                    showHangupUI();
                }).catch(err => {
                    statusLabel.innerText = "LỖI MICRO: Hãy cấp quyền.";
                    mainBtn.disabled = false;
                    mainBtn.innerText = "THỬ LẠI";
                });
            }

            peer.on('call', (call) => {
                statusLabel.innerText = "Có cuộc gọi đến...";
                // Tự động nhận cuộc gọi khi đối phương gọi tới
                navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                .then(stream => {
                    call.answer(stream);
                    handleCall(call);
                    showHangupUI();
                });
            });

            function callWithRetry(stream, attempt = 1) {
                if (attempt > 15) {
                    statusLabel.innerText = "Không tìm thấy đối phương.";
                    return;
                }
                const call = peer.call(friendId, stream);
                if (call) {
                    handleCall(call);
                    setTimeout(() => {
                        if (statusLabel.innerText !== "Đã kết nối") {
                            callWithRetry(stream, attempt + 1);
                        }
                    }, 3000);
                }
            }

            function handleCall(call) {
                call.on('stream', (remoteStream) => {
                    const audio = document.createElement('audio');
                    audio.srcObject = remoteStream;
                    audio.play().then(() => {
                        statusLabel.innerText = "Đã kết nối";
                    }).catch(e => {
                        statusLabel.innerText = "Lỗi phát âm thanh";
                    });
                });
            }

            function showHangupUI() {
                mainBtn.className = "btn btn-hangup";
                mainBtn.innerHTML = "X";
                mainBtn.disabled = false;
                mainBtn.onclick = () => window.ReactNativeWebView.postMessage("HANGUP");
            }

            peer.on('error', (err) => {
                console.error(err);
            });
        </script>
    </body>
    </html>
    `;

    const onMessage = (event) => {
        if (event.nativeEvent.data === "HANGUP") {
            navigation.goBack();
        }
    };

    // User Agent giả lập Safari trên iPhone để "đánh lừa" hệ thống cấp quyền Micro
    const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
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
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    webview: { flex: 1, backgroundColor: '#121212' },
});

export default VideoCallScreen;
