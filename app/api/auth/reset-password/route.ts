import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import {
  createPasswordResetForUser,
  hashPasswordResetToken,
  sendPasswordResetEmail,
} from '@/lib/password-reset';
import { getAppBaseUrlFromRequest } from '@/lib/email-verification';

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }
    const { email: normalizedEmail } = parsed.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      // Don't reveal that user doesn't exist
      return NextResponse.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    const { rawToken } = await createPasswordResetForUser(user.id);
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token: rawToken,
      baseUrl: getAppBaseUrlFromRequest(request),
    });

    return NextResponse.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json({ 
      error: 'Failed to process password reset request' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }
    const { token, newPassword } = parsed.data;

    const tokenHash = hashPasswordResetToken(token);

    // Find user by reset token hash. Legacy raw-token fallback is intentionally
    // not supported for newly issued tokens; runtime storage must remain hashed.
    const user = await (prisma as any).user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired reset token' 
      }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return NextResponse.json({ 
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    console.error('Error in reset password:', error);
    return NextResponse.json({ 
      error: 'Failed to reset password' 
    }, { status: 500 });
  }
}
