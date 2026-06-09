import { Router } from 'express';

import { CreateUserSchema, UpdateUserSchema, UserIdParamsSchema } from '../data/user.data';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { UserService } from '../services/user.service';

const userService = new UserService();
const userController = new UserController(userService);

export const userRoutes = Router();

userRoutes.post('/users', validate({ body: CreateUserSchema }), userController.create.bind(userController));
userRoutes.get('/users', userController.index.bind(userController));
userRoutes.get(
  '/users/:id',
  validate({ params: UserIdParamsSchema }),
  userController.show.bind(userController)
);
userRoutes.put(
  '/users/:id',
  validate({ params: UserIdParamsSchema, body: UpdateUserSchema }),
  userController.update.bind(userController)
);
userRoutes.delete(
  '/users/:id',
  validate({ params: UserIdParamsSchema }),
  userController.delete.bind(userController)
);
