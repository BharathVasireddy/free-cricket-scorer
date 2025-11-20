import React, { useState, useMemo } from 'react';
import { X, Search, Check } from 'lucide-react';
import type { SavedPlayer } from '../types';

interface PlayerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    players: SavedPlayer[];
    onSelect: (selectedPlayers: SavedPlayer[]) => void;
    title: string;
    maxSelection?: number;
}

const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
    isOpen,
    onClose,
    players,
    onSelect,
    title,
    maxSelection
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

    const filteredPlayers = useMemo(() => {
        return players.filter(player =>
            player.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [players, searchQuery]);

    const handleTogglePlayer = (playerId: string) => {
        const newSelected = new Set(selectedPlayerIds);
        if (newSelected.has(playerId)) {
            newSelected.delete(playerId);
        } else {
            if (maxSelection && newSelected.size >= maxSelection) {
                return; // Max selection reached
            }
            newSelected.add(playerId);
        }
        setSelectedPlayerIds(newSelected);
    };

    const handleConfirm = () => {
        const selected = players.filter(p => selectedPlayerIds.has(p.id));
        onSelect(selected);
        onClose();
        setSelectedPlayerIds(new Set()); // Reset selection
        setSearchQuery('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <p className="text-xs text-gray-500">
                            {selectedPlayerIds.size} selected {maxSelection ? `/ ${maxSelection}` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cricket-blue/20 focus:border-cricket-blue"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Player List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredPlayers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>No players found</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredPlayers.map(player => {
                                const isSelected = selectedPlayerIds.has(player.id);
                                return (
                                    <div
                                        key={player.id}
                                        onClick={() => handleTogglePlayer(player.id)}
                                        className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${isSelected
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'hover:bg-gray-50 border-transparent'
                                            } border`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition-colors ${isSelected
                                            ? 'bg-cricket-blue border-cricket-blue'
                                            : 'border-gray-300'
                                            }`}>
                                            {isSelected && <Check size={12} className="text-white" />}
                                        </div>

                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{player.name}</div>
                                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                {player.role && <span className="capitalize">{player.role}</span>}
                                                {player.phoneNumber && (
                                                    <>
                                                        <span>•</span>
                                                        <span>📱 {player.phoneNumber}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleConfirm}
                        disabled={selectedPlayerIds.size === 0}
                        className="w-full py-3 bg-gradient-to-r from-cricket-blue to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                    >
                        <span>Add Selected Players</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {selectedPlayerIds.size}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlayerSelectionModal;
