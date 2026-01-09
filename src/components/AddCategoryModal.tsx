/**
 * Add Category Modal
 * ====================
 * Allows users to create custom expense categories
 */

import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    TextInput,
    Modal,
    Animated,
    useColorScheme,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing } from '../theme';
import { useApp, CustomCategory } from '../context/AppContext';

interface AddCategoryModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd?: (category: CustomCategory) => void;
}

// Preset emoji icons
const emojiOptions = ['🏠', '🎓', '💼', '🎁', '✈️', '🏋️', '🎵', '📚', '🐕', '💰', '🛠️', '☕', '🍕', '🎮', '💄', '👶'];

// Preset colors
const colorOptions = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16',
    '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ visible, onClose, onAdd }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;
    const { addCustomCategory, customCategories } = useApp();

    const [name, setName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('🏠');
    const [selectedColor, setSelectedColor] = useState('#3B82F6');
    const [error, setError] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

    const slideAnim = useRef(new Animated.Value(300)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            setModalVisible(true);
            slideAnim.setValue(300);
            backdropAnim.setValue(0);
            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
            ]).start(() => setModalVisible(false));
        }
    }, [visible]);

    const handleAdd = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Please enter a category name');
            return;
        }

        const key = trimmedName.toLowerCase().replace(/\s+/g, '_');
        const exists = customCategories.some(c => c.key === key);
        if (exists) {
            setError('Category already exists');
            return;
        }

        const newCategory: CustomCategory = {
            key,
            label: trimmedName,
            icon: selectedEmoji,
            color: selectedColor,
        };

        addCustomCategory(newCategory);
        if (onAdd) onAdd(newCategory);

        // Reset
        setName('');
        setSelectedEmoji('🏠');
        setSelectedColor('#3B82F6');
        setError('');
        onClose();
    };

    const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#F4F4F5';

    return (
        <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>
            <View style={styles.center}>
                <Animated.View
                    style={[
                        styles.modal,
                        { backgroundColor: isDark ? colors.card : '#FFF', transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconPreview, { backgroundColor: selectedColor + '20' }]}>
                            <Typography variant="h2">{selectedEmoji}</Typography>
                        </View>
                        <Typography variant="lg" weight="semibold" style={{ marginTop: spacing.sm }}>
                            New Category
                        </Typography>
                        <Typography variant="caption" color="secondary">
                            Create a custom expense category
                        </Typography>
                    </View>

                    {/* Name Input */}
                    <View style={styles.inputWrapper}>
                        <Typography variant="caption" weight="semibold" color="secondary" style={{ marginBottom: 6 }}>
                            CATEGORY NAME
                        </Typography>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, color: colors.text }]}
                            placeholder="e.g., Pet Care, Gym"
                            placeholderTextColor={colors.textMuted}
                            value={name}
                            onChangeText={(t) => { setName(t); setError(''); }}
                            autoFocus
                        />
                        {error ? <Typography variant="caption" style={{ color: '#EF4444', marginTop: 4 }}>{error}</Typography> : null}
                    </View>

                    {/* Emoji Picker */}
                    <View style={styles.section}>
                        <Typography variant="caption" weight="semibold" color="secondary" style={{ marginBottom: 8 }}>
                            ICON
                        </Typography>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.optionRow}>
                                {emojiOptions.map((emoji) => (
                                    <Pressable
                                        key={emoji}
                                        onPress={() => setSelectedEmoji(emoji)}
                                        style={[
                                            styles.emojiOption,
                                            { backgroundColor: selectedEmoji === emoji ? selectedColor + '25' : inputBg }
                                        ]}
                                    >
                                        <Typography variant="body">{emoji}</Typography>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Color Picker */}
                    <View style={styles.section}>
                        <Typography variant="caption" weight="semibold" color="secondary" style={{ marginBottom: 8 }}>
                            COLOR
                        </Typography>
                        <View style={styles.colorGrid}>
                            {colorOptions.map((color) => (
                                <Pressable
                                    key={color}
                                    onPress={() => setSelectedColor(color)}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.colorSelected
                                    ]}
                                >
                                    {selectedColor === color && (
                                        <Icon name="check" size={16} color="#FFF" />
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttons}>
                        <Pressable
                            style={[styles.cancelBtn, { borderColor: colors.border }]}
                            onPress={onClose}
                        >
                            <Typography variant="body" color="secondary">Cancel</Typography>
                        </Pressable>
                        <Pressable
                            style={[styles.addBtn, { backgroundColor: selectedColor, opacity: name.trim() ? 1 : 0.5 }]}
                            onPress={handleAdd}
                            disabled={!name.trim()}
                        >
                            <Icon name="plus" size={18} color="#FFF" />
                            <Typography variant="body" weight="semibold" style={{ color: '#FFF', marginLeft: 6 }}>
                                Create
                            </Typography>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modal: { width: '100%', borderRadius: 24, padding: spacing.xl },
    header: { alignItems: 'center', marginBottom: spacing.lg },
    iconPreview: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    inputWrapper: { marginBottom: spacing.md },
    input: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 16 },
    section: { marginBottom: spacing.md },
    optionRow: { flexDirection: 'row', gap: 8 },
    emojiOption: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorOption: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    colorSelected: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' },
    buttons: { flexDirection: 'row', gap: 12, marginTop: spacing.lg },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    addBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

export default AddCategoryModal;
