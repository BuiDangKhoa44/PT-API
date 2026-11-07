import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Gắn lên route không cần đăng nhập (ví dụ /auth/login) */
export const Public = () => SetMetadata(IS_PUBLIC, true);
