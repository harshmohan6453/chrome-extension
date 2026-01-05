import { Download, RefreshCw, ArrowUpCircle } from 'lucide-react';

interface UpdateRequiredScreenProps {
  updateMessage: string;
  storeUrl: string;
  currentVersion: string;
  minVersion: string;
  onRetry: () => void;
  isChecking: boolean;
}

export function UpdateRequiredScreen({
  updateMessage,
  storeUrl,
  currentVersion,
  minVersion,
  onRetry,
  isChecking
}: UpdateRequiredScreenProps) {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-8 z-50">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-md text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Icon */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
          <div className="relative w-full h-full bg-card rounded-3xl border-2 border-primary neo-shadow-lg flex items-center justify-center">
            <ArrowUpCircle className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-foreground">
            Update Required
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {updateMessage}
          </p>
        </div>

        {/* Version info */}
        <div className="bg-card/50 rounded-xl border-2 border-foreground/10 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your version</span>
            <span className="font-mono font-bold text-destructive">{currentVersion}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Required version</span>
            <span className="font-mono font-bold text-primary">{minVersion}+</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg neo-shadow-lg neo-button transition-all hover:bg-primary/90"
          >
            <Download className="w-5 h-5" />
            Update Now
          </a>

          <button
            onClick={onRetry}
            disabled={isChecking}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-card border-2 border-foreground/20 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'I\'ve Updated - Check Again'}
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground/60">
          After updating, click "Check Again" or reopen the extension.
        </p>
      </div>
    </div>
  );
}
