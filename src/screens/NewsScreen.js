import React, { useState, useRef, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Image, Alert, 
    SafeAreaView, Dimensions, StatusBar, Platform, Modal, 
    FlatList, ActivityIndicator, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { postNews, subscribeToAllNews } from '../services/newsService';

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
    
    const [historyVisible, setHistoryVisible] = useState(false);
    const [newsList, setNewsList] = useState([]);
    const [selectedNews, setSelectedNews] = useState(null);
    const [filterUserId, setFilterUserId] = useState(null);
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    const cameraRef = useRef(null);

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

    const filterUsers = [];
    const userMap = new Set();
    newsList.forEach(news => {
        if (!userMap.has(news.userId) && news.userInfo) {
            userMap.add(news.userId);
            filterUsers.push({
                id: news.userId,
                name: getLastName(news.userInfo.fullName),
                avatar: news.userInfo.avatar
            });
        }
    });

    const displayedNews = filterUserId ? newsList.filter(n => n.userId === filterUserId) : newsList;

    const renderHistoryItem = ({ item }) => (
        <TouchableOpacity style={styles.historyImageContainer} onPress={() => setSelectedNews(item)}>
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

                {/* View Xem Chi Tiết Tin Tức (Đè trực tiếp lên Modal Lịch sử) */}
                {selectedNews && (
                    <View style={[StyleSheet.absoluteFill, styles.detailContainer]}>
                        <TouchableOpacity style={styles.closeDetailButton} onPress={() => setSelectedNews(null)}>
                            <Ionicons name="close" size={32} color="#fff" />
                        </TouchableOpacity>
                        
                        <View style={styles.detailCard}>
                            <View style={styles.detailImageWrapper}>
                                <Image source={{ uri: selectedNews.imageUrl }} style={styles.detailImage} />
                            </View>
                            <View style={styles.detailInfo}>
                                <UserAvatar uri={selectedNews.userInfo?.avatar} size={40} style={{ marginRight: 12 }} />
                                <View>
                                    <Text style={styles.detailName}>{getLastName(selectedNews.userInfo?.fullName)}</Text>
                                    <Text style={styles.detailTime}>{formatTime(selectedNews.createdAt)}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

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
                                            <UserAvatar uri={u.avatar} size={24} style={{marginRight: 10}} />
                                            <Text style={[styles.selectOptionText, filterUserId === u.id && styles.selectOptionTextActive]}>{u.name}</Text>
                                        </View>
                                        {filterUserId === u.id && <Ionicons name="checkmark" size={20} color="#0084ff" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableOpacity>
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
        width: SCREEN_WIDTH - 20,
        aspectRatio: 1,
        overflow: 'hidden',
        borderRadius: 40,
        backgroundColor: '#111',
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
        backgroundColor: '#000',
        justifyContent: 'center',
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
        borderColor: '#ffc107', 
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
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    historyText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        backgroundColor: '#18191a',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#3a3b3c',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#242526',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#3a3b3c',
    },
    selectButtonText: {
        color: '#e4e6eb',
        fontSize: 14,
        fontWeight: '600',
    },
    selectModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectDropdown: {
        backgroundColor: '#242526',
        width: SCREEN_WIDTH * 0.8,
        borderRadius: 15,
        padding: 15,
        maxHeight: SCREEN_HEIGHT * 0.6,
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
        padding: 5,
    },
    historyImageContainer: {
        flex: 1,
        margin: 5,
        aspectRatio: 1,
    },
    historyImage: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
    },

    detailContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeDetailButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 40 : 20,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    detailCard: {
        width: SCREEN_WIDTH * 0.9,
        alignItems: 'center',
    },
    detailImageWrapper: {
        width: SCREEN_WIDTH * 0.9,
        aspectRatio: 1,
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 20,
    },
    detailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    detailInfo: {
        flexDirection: 'row',
        alignItems: 'center',
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
    }
});

export default NewsScreen;
