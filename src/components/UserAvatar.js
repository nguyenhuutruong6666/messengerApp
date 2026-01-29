import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const UserAvatar = ({ uri, size = 50, style }) => {
    // Check if uri is valid and not the default ui-avatars one
    const isDefault = !uri || uri === '' || uri.includes('ui-avatars.com');

    if (isDefault) {
        return (
            <View style={[
                styles.defaultContainer,
                { width: size, height: size, borderRadius: size / 2 },
                style
            ]}>
                <Ionicons name="person" size={size * 0.6} color="#b0b3b8" />
            </View>
        );
    }

    return (
        <Image
            source={{ uri }}
            style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        />
    );
};

const styles = StyleSheet.create({
    defaultContainer: {
        backgroundColor: '#3a3b3c',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
});

export default UserAvatar;
