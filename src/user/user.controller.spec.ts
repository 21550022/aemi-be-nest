import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller.js';

describe('UserController', () => {
  let userController: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
    }).compile();

    userController = module.get<UserController>(UserController);
  });

  describe('user', () => {
    it('should return "hello user"', () => {
      expect(userController.getUser()).toBe('hello user');
    });
  });
});
