import bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AdminUser } from '../entities/admin-user.entity';

function makeUserRepo(user: Partial<AdminUser> | null = null) {
  return {
    findOne: jest.fn().mockResolvedValue(user),
    save: jest.fn().mockImplementation(async (u: AdminUser) => u),
  };
}

function makeJwtService(): jest.Mocked<Pick<JwtService, 'signAsync'>> {
  return {
    signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
  };
}

describe('AuthService.login', () => {
  it('returns a token and user info for valid credentials', async () => {
    const hash = await bcrypt.hash('admin', 10);
    const userRepo = makeUserRepo({ id: 1, username: 'admin', passwordHash: hash });
    const jwtService = makeJwtService();
    const service = new AuthService(userRepo as any, jwtService as any);

    const result = await service.login({ username: 'admin', password: 'admin' });

    expect(result.token).toBe('signed.jwt.token');
    expect(result.user.username).toBe('admin');
    expect(result.user.id).toBe(1);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      username: 'admin',
    });
  });

  it('throws UnauthorizedException for a wrong password', async () => {
    const hash = await bcrypt.hash('admin', 10);
    const userRepo = makeUserRepo({ id: 1, username: 'admin', passwordHash: hash });
    const service = new AuthService(userRepo as any, makeJwtService() as any);

    await expect(service.login({ username: 'admin', password: 'wrong' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for an unknown username', async () => {
    const userRepo = makeUserRepo(null);
    const service = new AuthService(userRepo as any, makeJwtService() as any);

    await expect(service.login({ username: 'nobody', password: 'x' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('AuthService.changePassword', () => {
  it('throws UnauthorizedException when the current password is wrong', async () => {
    const hash = await bcrypt.hash('oldpass', 10);
    const userRepo = makeUserRepo({ id: 1, passwordHash: hash, updatedAt: new Date() });
    const service = new AuthService(userRepo as any, makeJwtService() as any);

    await expect(
      service.changePassword(1, { currentPassword: 'wrong', newPassword: 'newpass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('re-hashes the password: new hash validates with new password', async () => {
    const originalHash = await bcrypt.hash('oldpass', 10);
    const user = { id: 1, passwordHash: originalHash, updatedAt: new Date() };
    const userRepo = makeUserRepo(user);
    const service = new AuthService(userRepo as any, makeJwtService() as any);

    await service.changePassword(1, { currentPassword: 'oldpass', newPassword: 'newpass' });

    expect(await bcrypt.compare('newpass', user.passwordHash)).toBe(true);
  });

  it('old password no longer validates after a successful change', async () => {
    const originalHash = await bcrypt.hash('oldpass', 10);
    const user = { id: 1, passwordHash: originalHash, updatedAt: new Date() };
    const userRepo = makeUserRepo(user);
    const service = new AuthService(userRepo as any, makeJwtService() as any);

    await service.changePassword(1, { currentPassword: 'oldpass', newPassword: 'newpass' });

    expect(await bcrypt.compare('oldpass', user.passwordHash)).toBe(false);
  });

  it('persists the updated user via the repository', async () => {
    const originalHash = await bcrypt.hash('pass', 10);
    const user = { id: 1, passwordHash: originalHash, updatedAt: new Date() };
    const userRepo = makeUserRepo(user);
    const service = new AuthService(userRepo as any, makeJwtService() as any);

    await service.changePassword(1, { currentPassword: 'pass', newPassword: 'newpass' });

    expect(userRepo.save).toHaveBeenCalledTimes(1);
  });

  it('throws UnauthorizedException when user is not found', async () => {
    const userRepo = makeUserRepo(null);
    const service = new AuthService(userRepo as any, makeJwtService() as any);

    await expect(
      service.changePassword(99, { currentPassword: 'any', newPassword: 'new' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
