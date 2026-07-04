import { userRepository, UserRepository } from '../repositories/user.repository';
import { NotFoundError } from '../errors';

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async getUserProfile(id: string) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Exclude passwordHash from returned profile
    const { passwordHash, ...profile } = user;
    return profile;
  }
}

export const userService = new UserService(userRepository);
