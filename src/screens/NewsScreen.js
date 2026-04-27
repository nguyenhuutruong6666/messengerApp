import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Alert,
    Dimensions, StatusBar, Platform, Modal,
    FlatList, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView,
    TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { postNews, subscribeToAllNews, deleteNews } from '../services/newsService';
import { getChatId, sendMessage } from '../services/chatService';
import { getFriends } from '../services/friendService';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NewsScreen = () => {
    const { user, userData } = useAuth();
    const [facing, setFacing] = useState('back');
    const [flash, setFlash] = useState('off');
    const [zoomIndex, setZoomIndex] = useState(0);
    const zoomLevels = [0, 0.05, 0.1];
    const zoomLabels = ['1x', '2x', '3x'];

    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState(null);
    const [isFocused, setIsFocused] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const [historyVisible, setHistoryVisible] = useState(false);
    const [newsList, setNewsList] = useState([]);
    const [selectedNewsIndex, setSelectedNewsIndex] = useState(null);
    const [filterUserId, setFilterUserId] = useState(null);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [friendIds, setFriendIds] = useState([]);

    const [replyText, setReplyText] = useState('');
    const [replySending, setReplySending] = useState(false);
    const navigation = useNavigation();

    const cameraRef = useRef(null);
    const detailFlatListRef = useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            setIsFocused(true);
            return () => {
                setIsFocused(false);
                setPhoto(null);
            };
        }, [])
    );

    useEffect(() => {
        const unsubscribe = subscribeToAllNews((data) => {
            setNewsList(data);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user?.uid) {
            getFriends(user.uid).then(ids => setFriendIds(ids)).catch(() => { });
        }
    }, [user?.uid]);

    useEffect(() => {
        setReplyText('');
    }, [selectedNewsIndex]);

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.message}>Chúng tôi cần quyền truy cập camera để chụp ảnh.</Text>
                    <TouchableOpacity style={styles.button} onPress={requestPermission}>
                        <Text style={styles.text}>Cấp quyền</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const toggleCameraFacing = () => setFacing(current => (current === 'back' ? 'front' : 'back'));

    const toggleFlash = () => {
        setFlash(current => {
            if (current === 'off') return 'on';
            if (current === 'on') return 'auto';
            return 'off';
        });
    };

    const toggleZoom = () => {
        setZoomIndex((prev) => (prev + 1) % zoomLabels.length);
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photoData = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: false,
                    exif: false,
                });
                setPhoto(photoData.uri);
            } catch (error) {
                console.error("Lỗi chụp ảnh:", error);
                Alert.alert("Lỗi", "Không thể chụp ảnh.");
            }
        }
    };

    const pickImageFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const retakePicture = () => setPhoto(null);

    const handleSavePicture = async () => {
        if (!photo) return;
        setUploading(true);
        try {
            await postNews(photo, user.uid);
            Alert.alert("Thành công", "Đã đăng tin tức mới!");
            setPhoto(null);
        } catch (error) {
            Alert.alert("Lỗi", "Không thể đăng tin lúc này.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteNews = (newsItem) => {
        Alert.alert(
            "Xóa tin",
            "Bạn có chắc chắn muốn xóa tin này không?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteNews(newsItem.id);
                            setSelectedNewsIndex(null);
                        } catch (e) {
                            Alert.alert("Lỗi", "Không thể xóa tin.");
                        }
                    }
                }
            ]
        );
    };

    const handleDownloadNews = async (imageUrl) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Lỗi', 'Cần quyền truy cập thư viện để lưu ảnh!');
                return;
            }

            const filename = imageUrl.split('/').pop().split('?')[0] || 'downloaded_image.jpg';
            const fileUri = `${FileSystem.documentDirectory}${filename}`;

            const downloadedFile = await FileSystem.downloadAsync(imageUrl, fileUri);

            if (downloadedFile.status === 200) {
                await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
                Alert.alert('Thành công', 'Đã lưu ảnh vào thư viện!');
            } else {
                Alert.alert('Lỗi', 'Không thể tải ảnh.');
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tải ảnh.');
        }
    };

    const handleSendReply = async (currentNews) => {
        if (!replyText.trim() || !currentNews) return;
        setReplySending(true);
        const chatId = getChatId(user.uid, currentNews.userId);
        try {
            await sendMessage(chatId, replyText, [], user.uid, {
                newsId: currentNews.id,
                imageUrl: currentNews.imageUrl
            });

            setReplyText('');
            setSelectedNewsIndex(null);
            setHistoryVisible(false);
            navigation.navigate('ChatDetail', { friend: { ...currentNews.userInfo, id: currentNews.userId } });
        } catch (error) {
            console.error('Lỗi gửi reply:', error);
            Alert.alert("Lỗi", "Không thể gửi tin nhắn.");
        } finally {
            setReplySending(false);
        }
    };

    const getLastName = (fullName) => {
        if (!fullName) return 'Người dùng';
        const parts = fullName.trim().split(' ');
        return parts[parts.length - 1];
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${hours}:${minutes} - ${day}/${month}/${year}`;
    };

    const allowedUserIds = new Set([user.uid, ...friendIds]);
    const filterUsers = [];
    const userMap = new Set();
    newsList.forEach(news => {
        if (!userMap.has(news.userId) && news.userInfo && allowedUserIds.has(news.userId)) {
            userMap.add(news.userId);
            filterUsers.push({
                id: news.userId,
                name: getLastName(news.userInfo.fullName),
                avatar: news.userInfo.avatar,
                isSelf: news.userId === user.uid,
            });
        }
    });
    filterUsers.sort((a, b) => (b.isSelf ? 1 : 0) - (a.isSelf ? 1 : 0));

    const displayedNews = filterUserId
        ? newsList.filter(n => n.userId === filterUserId)
        : newsList.filter(n => allowedUserIds.has(n.userId));

    const renderHistoryItem = ({ item, index }) => (
        <TouchableOpacity style={styles.historyImageContainer} onPress={() => {
            setSelectedNewsIndex(index);
            setReplyText('');
        }}>
            <Image source={{ uri: item.imageUrl }} style={styles.historyImage} />
        </TouchableOpacity>
    );

    if (photo) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar hidden />
                <View style={styles.cameraContainer}>
                    <View style={styles.cameraWrapper}>
                        <Image source={{ uri: photo }} style={styles.preview} />
                    </View>
                </View>

                <View style={styles.previewActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={retakePicture} disabled={uploading}>
                        <Ionicons name="trash-outline" size={24} color="#fff" />
                        <Text style={styles.actionText}>Xóa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton, uploading && { opacity: 0.7 }]}
                        onPress={handleSavePicture}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <>
                                <Ionicons name="send" size={20} color="#000" />
                                <Text style={[styles.actionText, { color: '#000', fontWeight: 'bold' }]}>Đăng tin</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar hidden={false} barStyle="light-content" backgroundColor="#000" />

            {/* Khung Camera bo tròn CẢ TRÊN VÀ DƯỚI */}
            <View style={styles.cameraContainer}>
                <View style={styles.cameraWrapper}>
                    {isFocused && (
                        <CameraView
                            style={styles.camera}
                            facing={facing}
                            flash={flash}
                            zoom={zoomLevels[zoomIndex]}
                            ref={cameraRef}
                        >
                            {/* Top Controls trong Camera */}
                            <View style={styles.topControls}>
                                <TouchableOpacity style={styles.topIconBg} onPress={toggleFlash}>
                                    <Ionicons
                                        name={flash === 'on' ? 'flash' : (flash === 'auto' ? 'flash-outline' : 'flash-off')}
                                        size={22}
                                        color="#fff"
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.topIconBg} onPress={toggleZoom}>
                                    <Text style={styles.zoomText}>{zoomLabels[zoomIndex]}</Text>
                                </TouchableOpacity>
                            </View>
                        </CameraView>
                    )}
                </View>
            </View>

            {/* Bottom Controls nền đen */}
            <View style={styles.bottomSection}>
                <View style={styles.bottomControlsRow}>
                    {/* Thư viện (Tải ảnh từ máy) */}
                    <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
                        {newsList.length > 0 ? (
                            <Image source={{ uri: newsList[0].imageUrl }} style={styles.galleryImage} />
                        ) : (
                            <View style={[styles.galleryImage, { backgroundColor: '#333' }]} />
                        )}
                    </TouchableOpacity>

                    {/* Nút Chụp Ảnh */}
                    <TouchableOpacity style={styles.captureOuter} onPress={takePicture}>
                        <View style={styles.captureInner} />
                    </TouchableOpacity>

                    {/* Nút Đổi Camera */}
                    <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                        <Ionicons name="sync-outline" size={32} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Nút Lịch sử */}
                <TouchableOpacity style={styles.historyButton} onPress={() => setHistoryVisible(true)}>
                    <UserAvatar uri={userData?.avatar} size={28} style={{ marginRight: 8 }} />
                    <Text style={styles.historyText}>Lịch sử</Text>
                    <Ionicons name="chevron-down" size={16} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </View>

            {/* Modal Lịch sử Tin Tức */}
            <Modal
                visible={historyVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setHistoryVisible(false)}
                onDismiss={() => setHistoryVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        {/* View rỗng để cân bằng với nút đóng bên phải, giúp nút Select được căn giữa */}
                        <View style={{ width: 32 }} />

                        {newsList.length > 0 ? (
                            <TouchableOpacity style={styles.selectButton} onPress={() => setFilterModalVisible(true)}>
                                <Text style={styles.selectButtonText}>
                                    {filterUserId === null ? 'Tất cả mọi người' : filterUsers.find(u => u.id === filterUserId)?.name}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#e4e6eb" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.modalTitle}>Lịch sử</Text>
                        )}

                        <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                            <Ionicons name="close-circle" size={32} color="#b0b3b8" />
                        </TouchableOpacity>
                    </View>

                    {displayedNews.length === 0 ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: '#b0b3b8', fontSize: 16 }}>Không có tin tức nào để hiển thị.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={displayedNews}
                            keyExtractor={item => item.id}
                            numColumns={3}
                            contentContainerStyle={styles.historyList}
                            renderItem={renderHistoryItem}
                        />
                    )}
                </View>

                {/* View Chọn Filter đè trực tiếp lên Modal Lịch sử thay vì dùng Modal riêng (Tránh lỗi đơ iOS) */}
                {filterModalVisible && (
                    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
                        <TouchableOpacity style={styles.selectModalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
                            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setFilterModalVisible(false)} />

                            <View style={styles.selectDropdown}>
                                <Text style={styles.selectTitle}>Lọc theo người đăng</Text>

                                <TouchableOpacity
                                    style={[styles.selectOption, filterUserId === null && styles.selectOptionActive]}
                                    onPress={() => { setFilterUserId(null); setFilterModalVisible(false); }}
                                >
                                    <Text style={[styles.selectOptionText, filterUserId === null && styles.selectOptionTextActive]}>Tất cả mọi người</Text>
                                    {filterUserId === null && <Ionicons name="checkmark" size={20} color="#0084ff" />}
                                </TouchableOpacity>

                                {filterUsers.map(u => (
                                    <TouchableOpacity
                                        key={u.id}
                                        style={[styles.selectOption, filterUserId === u.id && styles.selectOptionActive]}
                                        onPress={() => { setFilterUserId(u.id); setFilterModalVisible(false); }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <UserAvatar uri={u.avatar} size={24} style={{ marginRight: 10 }} />
                                            <Text style={[styles.selectOptionText, filterUserId === u.id && styles.selectOptionTextActive]}>{u.name}</Text>
                                            {u.isSelf && (
                                                <View style={styles.selfBadge}>
                                                    <Ionicons name="checkmark" size={11} color="#fff" />
                                                </View>
                                            )}
                                        </View>
                                        {filterUserId === u.id && <Ionicons name="checkmark" size={20} color="#0084ff" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* View Xem Chi Tiết Tin Tức - Hỗ trợ vuốt trái/phải */}
                {selectedNewsIndex !== null && displayedNews.length > 0 && (
                    <View style={[StyleSheet.absoluteFill, styles.detailContainer]}>
                        {/* Nút đóng */}
                        <TouchableOpacity style={styles.closeDetailButton} onPress={() => setSelectedNewsIndex(null)}>
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>



                        {/* Swipeable FlatList */}
                        <FlatList
                            ref={detailFlatListRef}
                            data={displayedNews}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={item => item.id}
                            getItemLayout={(_, index) => ({
                                length: SCREEN_WIDTH,
                                offset: SCREEN_WIDTH * index,
                                index,
                            })}
                            initialScrollIndex={selectedNewsIndex}
                            onMomentumScrollEnd={(e) => {
                                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                                setSelectedNewsIndex(index);
                            }}
                            renderItem={({ item }) => (
                                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                    <View style={styles.detailPage}>
                                        <View style={styles.detailCard}>
                                            <View style={styles.detailImageWrapper}>
                                                <Image source={{ uri: item.imageUrl }} style={styles.detailImage} />
                                            </View>
                                            <View style={styles.detailInfo}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <UserAvatar uri={item.userInfo?.avatar} size={40} style={{ marginRight: 12 }} />
                                                    <View>
                                                        <Text style={styles.detailName}>{getLastName(item.userInfo?.fullName)}</Text>
                                                        <Text style={styles.detailTime}>{formatTime(item.createdAt)}</Text>
                                                    </View>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <TouchableOpacity
                                                        onPress={() => handleDownloadNews(item.imageUrl)}
                                                        style={[styles.actionButtonCircular, { backgroundColor: 'rgba(255, 255, 255, 0.15)', marginRight: item.userId === user.uid ? 10 : 0 }]}
                                                    >
                                                        <Ionicons name="download-outline" size={20} color="#fff" />
                                                    </TouchableOpacity>

                                                    {item.userId === user.uid && (
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteNews(item)}
                                                            style={[styles.actionButtonCircular, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}
                                                        >
                                                            <Ionicons name="trash" size={20} color="#ff3b30" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableWithoutFeedback>
                            )}
                        />

                        {/* Thanh reply nếu không phải ảnh của mình */}
                        {displayedNews[selectedNewsIndex]?.userId !== user.uid && (
                            <View style={[styles.newsReplyContainer, {
                                paddingBottom: keyboardHeight > 0 ? keyboardHeight + 10 : (Platform.OS === 'ios' ? 20 : 10)
                            }]}>
                                <TextInput
                                    style={styles.newsReplyInput}
                                    placeholder="Trả lời tin này..."
                                    placeholderTextColor="#aaa"
                                    value={replyText}
                                    onChangeText={setReplyText}
                                    multiline
                                />
                                <TouchableOpacity
                                    style={styles.newsReplyButton}
                                    onPress={() => handleSendReply(displayedNews[selectedNewsIndex])}
                                    disabled={replySending || !replyText.trim()}
                                >
                                    {replySending ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Ionicons name="send" size={20} color={replyText.trim() ? '#fff' : '#aaa'} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'space-between',
    },
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraWrapper: {
        width: SCREEN_WIDTH - 30,
        aspectRatio: 1,
        overflow: 'hidden',
        borderRadius: 40,
        backgroundColor: '#111',
        borderWidth: 3,
        borderColor: '#0084ff',
        shadowColor: '#0084ff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    camera: {
        flex: 1,
    },
    preview: {
        flex: 1,
        resizeMode: 'cover',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
    },
    topIconBg: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    bottomSection: {
        height: 180,
        backgroundColor: '#050505',
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: '#1a1a1a',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 20,
    },
    bottomControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    captureOuter: {
        width: 86,
        height: 86,
        borderRadius: 43,
        borderWidth: 4,
        borderColor: '#0084ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#fff',
    },
    galleryButton: {
        width: 46,
        height: 46,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    flipButton: {
        width: 46,
        height: 46,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: 20,
        backgroundColor: '#1a1a1a',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#333',
    },
    historyText: {
        color: '#e4e6eb',
        fontSize: 15,
        fontWeight: 'bold',
    },
    closePreviewButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 20 : 40,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewActions: {
        height: 120,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        backgroundColor: '#000',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
    },
    primaryButton: {
        backgroundColor: '#ffc107',
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
        fontWeight: '500',
    },

    modalContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 25 : 20,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    selectButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    selectModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
    },
    selectDropdown: {
        backgroundColor: '#1a1a1a',
        width: SCREEN_WIDTH * 0.65,
        borderRadius: 20,
        padding: 10,
        maxHeight: SCREEN_HEIGHT * 0.6,
        marginTop: Platform.OS === 'ios' ? 85 : 75,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    selectTitle: {
        color: '#b0b3b8',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#3a3b3c',
        paddingBottom: 10,
    },
    selectOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    selectOptionActive: {
        backgroundColor: 'rgba(0, 132, 255, 0.1)',
    },
    selectOptionText: {
        color: '#e4e6eb',
        fontSize: 16,
    },
    selectOptionTextActive: {
        color: '#0084ff',
        fontWeight: 'bold',
    },
    historyList: {
        padding: 8,
    },
    historyImageContainer: {
        flex: 1,
        margin: 6,
        aspectRatio: 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    historyImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    detailContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    closeDetailButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    detailPage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 80 : 0,
    },
    detailCard: {
        width: SCREEN_WIDTH * 0.95,
        alignItems: 'center',
    },
    detailImageWrapper: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 35,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 15,
    },
    detailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    detailInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    detailName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    detailTime: {
        color: '#b0b3b8',
        fontSize: 14,
        marginTop: 2,
    },
    actionButtonCircular: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newsReplyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 15,
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#1a1a1a',
    },
    newsReplyInput: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        color: '#e4e6eb',
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginRight: 12,
        maxHeight: 100,
        fontSize: 15,
    },
    newsReplyButton: {
        backgroundColor: '#0084ff',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selfBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#0084ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
});

export default NewsScreen;
