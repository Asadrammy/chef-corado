'use client';

import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/form-error';
import { cn } from '@/lib/utils';

interface FormFieldWrapperProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  helperText?: string;
}

export function FormFieldWrapper({
  label,
  error,
  required,
  children,
  className,
  helperText,
}: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {error && <FormError message={error} />}
      {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
