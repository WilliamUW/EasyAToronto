import { FileText, Home, Info } from "lucide-react";

import { cn } from "@/lib/utils";

interface BottomNavProps {
  currentPage: "home" | "preparation" | "info";
  onPageChange: (page: "home" | "preparation" | "info") => void;
}

export function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t">
      <div className="container max-w-screen-lg mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => onPageChange("home")}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-colors",
              currentPage === "home"
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => onPageChange("preparation")}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-colors",
              currentPage === "preparation"
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs mt-1">Preparation</span>
          </button>
          <button
            onClick={() => onPageChange("info")}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-colors",
              currentPage === "info"
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <Info className="h-6 w-6" />
            <span className="text-xs mt-1">Info</span>
          </button>
        </div>
      </div>
    </div>
  );
} 