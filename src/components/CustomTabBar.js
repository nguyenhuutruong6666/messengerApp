import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH - 40;
const TAB_BAR_HEIGHT = 70;
const CIRCLE_SIZE = 50;

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const animatedValue = useRef(new Animated.Value(state.index)).current;
    const pathRef = useRef(null);

    const tabWidth = TAB_BAR_WIDTH / state.routes.length;

    useEffect(() => {
        Animated.spring(animatedValue, {
            toValue: state.index,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    }, [state.index]);

    useEffect(() => {
        // Update SVG path smoothly on every animation frame
        const listener = animatedValue.addListener(({ value }) => {
            const currentX = value * tabWidth + tabWidth / 2;
            if (pathRef.current) {
                pathRef.current.setNativeProps({ d: generatePath(currentX) });
            }
        });

        // Initialize path
        const currentX = state.index * tabWidth + tabWidth / 2;
        if (pathRef.current) {
            pathRef.current.setNativeProps({ d: generatePath(currentX) });
        }

        return () => animatedValue.removeListener(listener);
    }, [state.routes.length, tabWidth]);

    const generatePath = (notchX) => {
        const w = TAB_BAR_WIDTH;
        const h = TAB_BAR_HEIGHT;
        const r = 20; // border radius

        // Notch bezier curves
        const nW = 38; // half of notch width
        const nD = 38; // notch depth

        let d = `M 0 ${r} `;
        d += `A ${r} ${r} 0 0 1 ${r} 0 `;
        d += `L ${notchX - nW} 0 `;
        d += `C ${notchX - 15} 0, ${notchX - 25} ${nD}, ${notchX} ${nD} `;
        d += `C ${notchX + 25} ${nD}, ${notchX + 15} 0, ${notchX + nW} 0 `;
        d += `L ${w - r} 0 `;
        d += `A ${r} ${r} 0 0 1 ${w} ${r} `;
        d += `L ${w} ${h - r} `;
        d += `A ${r} ${r} 0 0 1 ${w - r} ${h} `;
        d += `L ${r} ${h} `;
        d += `A ${r} ${r} 0 0 1 0 ${h - r} `;
        d += `Z`;

        return d;
    };

    const circleTranslateX = animatedValue.interpolate({
        inputRange: state.routes.map((_, i) => i),
        outputRange: state.routes.map(i => i * tabWidth + tabWidth / 2 - CIRCLE_SIZE / 2),
    });

    return (
        <View style={styles.wrapper}>
            {/* The SVG Tab Bar Background with True Cutout */}
            <View style={styles.svgContainer}>
                <Svg width={TAB_BAR_WIDTH} height={TAB_BAR_HEIGHT}>
                    <Path ref={pathRef} fill="#1c1c1e" />
                </Svg>
            </View>

            {/* The floating circle inside the notch */}
            <Animated.View
                style={[
                    styles.floatingCircle,
                    { transform: [{ translateX: circleTranslateX }] }
                ]}
            />

            {/* The Tabs Container */}
            <View style={styles.tabsContainer}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    let iconName;
                    if (route.name === 'News') iconName = isFocused ? 'camera' : 'camera-outline';
                    else if (route.name === 'Messages') iconName = isFocused ? 'chatbubble' : 'chatbubble-outline';
                    else if (route.name === 'Friends') iconName = isFocused ? 'people' : 'people-outline';
                    else if (route.name === 'Notifications') iconName = isFocused ? 'notifications' : 'notifications-outline';
                    else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

                    const iconTranslateY = animatedValue.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [0, -32, 0], // Move up into the floating circle
                        extrapolate: 'clamp',
                    });

                    const textOpacity = animatedValue.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [0.6, 1, 0.6],
                        extrapolate: 'clamp',
                    });

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={options.tabBarTestID}
                            onPress={onPress}
                            style={styles.tabButton}
                            activeOpacity={1}
                        >
                            {/* Animated Icon */}
                            <Animated.View style={[styles.iconContainer, { transform: [{ translateY: iconTranslateY }] }]}>
                                <Ionicons
                                    name={iconName}
                                    size={24}
                                    color={isFocused ? '#fff' : '#b0b3b8'}
                                />
                            </Animated.View>

                            {/* Fixed Text */}
                            <Animated.Text style={[styles.tabText, { opacity: textOpacity, fontWeight: isFocused ? 'bold' : 'normal' }]}>
                                {options.title || route.name}
                            </Animated.Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        width: TAB_BAR_WIDTH,
        height: TAB_BAR_HEIGHT,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    svgContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    floatingCircle: {
        position: 'absolute',
        top: -CIRCLE_SIZE / 2 + 3, // Sit perfectly in the notch
        left: 0,
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: '#1c1c1e', // Match bar background
    },
    tabsContainer: {
        flexDirection: 'row',
        ...StyleSheet.absoluteFillObject,
    },
    tabButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 5,
    },
    tabText: {
        color: '#fff',
        fontSize: 12,
        position: 'absolute',
        bottom: 12,
    },
});

export default CustomTabBar;
