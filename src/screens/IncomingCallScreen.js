import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Image,
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import UserAvatar from '../components/UserAvatar';

const IncomingCallScreen = ({ route }) => {
    const { roomName, friend, isVideo } = route.params;
    const navigation = useNavigation();

    const handleAccept = () => {
        navigation.replace('VideoCall', {
            roomName,
            friend,
            isVideo,
            isCaller: false
        });
    };

    const handleDecline = () => {
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#1e1e1e', '#121212', '#000']}
                style={styles.gradient}
            >
                <SafeAreaView style={styles.content}>
                    <View style={styles.topSection}>
                        <Text style={styles.incomingText}>Cuộc gọi đến...</Text>
                        <View style={styles.avatarContainer}>
                            <UserAvatar uri={friend.avatar} size={120} />
                        </View>
                        <Text style={styles.friendName}>{friend.fullName}</Text>
                        <Text style={styles.callType}>Cuộc gọi thoại</Text>
                    </View>

                    <View style={styles.bottomSection}>
                        <View style={styles.buttonRow}>
                            {/* Nút từ chối */}
                            <View style={styles.buttonWrapper}>
                                <TouchableOpacity
                                    style={[styles.callButton, styles.declineButton]}
                                    onPress={handleDecline}
                                >
                                    <Ionicons name="close" size={35} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.buttonLabel}>Từ chối</Text>
                            </View>

                            {/* Nút chấp nhận */}
                            <View style={styles.buttonWrapper}>
                                <TouchableOpacity
                                    style={[styles.callButton, styles.acceptButton]}
                                    onPress={handleAccept}
                                >
                                    <Ionicons name="call" size={30} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.buttonLabel}>Chấp nhận</Text>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 60,
    },
    topSection: {
        alignItems: 'center',
        marginTop: 40,
    },
    incomingText: {
        color: '#0084FF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 30,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    avatarContainer: {
        marginBottom: 20,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#1E1E1E',
        padding: 5,
    },
    friendName: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    callType: {
        color: '#A0A3A8',
        fontSize: 16,
        marginTop: 8,
    },
    bottomSection: {
        width: '100%',
        paddingHorizontal: 40,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    buttonWrapper: {
        alignItems: 'center',
    },
    callButton: {
        width: 75,
        height: 75,
        borderRadius: 38,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    declineButton: {
        backgroundColor: '#FF3B30',
    },
    acceptButton: {
        backgroundColor: '#4CD964',
    },
    buttonLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    }
});

export default IncomingCallScreen;
