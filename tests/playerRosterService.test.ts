import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  MockTimestamp,
  docMock,
  getDocMock,
  setDocMock,
  updateDocMock,
} = vi.hoisted(() => {
  class HoistedMockTimestamp {
    static now() {
      return new HoistedMockTimestamp();
    }

    toDate() {
      return new Date('2026-04-02T00:00:00.000Z');
    }
  }

  return {
    MockTimestamp: HoistedMockTimestamp,
    docMock: vi.fn((_db: unknown, collectionName: string, id: string) => ({ collectionName, id })),
    getDocMock: vi.fn(),
    setDocMock: vi.fn(async () => undefined),
    updateDocMock: vi.fn(async () => undefined),
  };
});

vi.mock('../src/lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  getDoc: getDocMock,
  setDoc: setDocMock,
  updateDoc: updateDocMock,
  Timestamp: MockTimestamp,
}));

import { savePlayerToRoster, updatePlayerInRoster } from '../src/lib/playerRosterService';

describe('playerRosterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('omits undefined optional fields when saving a new player', async () => {
    getDocMock.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });

    await savePlayerToRoster('user-1', {
      name: 'PLAYER ONE',
      phoneNumber: undefined,
      role: 'allrounder',
    });

    expect(setDocMock).toHaveBeenCalledTimes(1);

    const [, payload] = setDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      userId: 'user-1',
      players: [
        expect.objectContaining({
          name: 'PLAYER ONE',
          role: 'allrounder',
        }),
      ],
    });
    expect(payload.players[0]).not.toHaveProperty('phoneNumber');
  });

  it('omits undefined optional fields when updating an existing player', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        players: [
          {
            id: 'player-1',
            name: 'PLAYER ONE',
            phoneNumber: '9999999999',
            role: 'allrounder',
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
          },
        ],
        updatedAt: MockTimestamp.now(),
      }),
    });

    await updatePlayerInRoster('user-1', 'player-1', {
      phoneNumber: undefined,
      role: 'bowler',
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.players[0]).toMatchObject({
      id: 'player-1',
      name: 'PLAYER ONE',
      role: 'bowler',
    });
    expect(payload.players[0]).not.toHaveProperty('phoneNumber');
  });
});
