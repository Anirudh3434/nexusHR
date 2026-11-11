import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Stepper({ steps, currentStep, orientation = 'horizontal', className }: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <div className={cn("w-full space-y-1", className)}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex items-start gap-3.5 group">
              {/* Step Circle & Connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold transition-all duration-300 shrink-0",
                    isCompleted && "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20",
                    isCurrent && "border-blue-600 text-blue-600 bg-white ring-4 ring-blue-100 dark:text-blue-400 dark:bg-slate-900 dark:ring-blue-950/60 shadow-md",
                    isPending && "border-gray-300 text-gray-400 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/40"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 min-h-[30px] my-1 transition-all duration-300",
                      isCompleted ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </div>

              {/* Text content */}
              <div className={cn("pt-1 pb-3 flex-1", isLast && "pb-1")}>
                <p
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isCompleted && "text-blue-600 dark:text-blue-400",
                    isCurrent && "text-gray-900 dark:text-slate-100",
                    isPending && "text-gray-400 dark:text-slate-500"
                  )}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p
                    className={cn(
                      "text-xs mt-0.5 leading-snug transition-colors",
                      isCurrent ? "text-gray-600 dark:text-slate-400" : "text-gray-400 dark:text-slate-500"
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                    isCompleted && "bg-blue-600 border-blue-600 text-white",
                    isCurrent && "border-blue-600 text-blue-600 bg-white ring-4 ring-blue-100 dark:text-blue-400 dark:bg-slate-900",
                    isPending && "border-gray-300 text-gray-400 bg-gray-50 dark:border-slate-600 dark:bg-slate-800/50"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isCompleted && "text-blue-600 dark:text-blue-400",
                      isCurrent && "text-gray-900 dark:text-slate-100",
                      isPending && "text-gray-400"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-0.5 hidden sm:block dark:text-slate-400">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 mb-6">
                  <div
                    className={cn(
                      "h-0.5 transition-all duration-300",
                      isCompleted ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-700"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
