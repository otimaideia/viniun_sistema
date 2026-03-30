import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ResponsibleUser {
  id: string;
  name: string;
}

interface ResponsibleSelectProps {
  value: string | null;
  users: ResponsibleUser[];
  onValueChange: (userId: string | null) => void;
  disabled?: boolean;
}

export function ResponsibleSelect({ 
  value, 
  users, 
  onValueChange,
  disabled 
}: ResponsibleSelectProps) {
  const [open, setOpen] = useState(false);
  
  const selectedUser = users.find(u => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Selecionar responsável"
          disabled={disabled}
          className="h-auto min-h-[36px] sm:min-h-0 py-1 px-2 justify-start font-normal hover:bg-accent/50"
        >
          {selectedUser ? (
            <Badge 
              variant="secondary" 
              className="bg-primary/10 text-primary border-0 font-normal"
            >
              {selectedUser.name}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-popover z-50" align="start">
        <Command>
          <CommandInput placeholder="Buscar usuário..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Sem responsável</span>
                {!value && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => {
                    onValueChange(user.id);
                    setOpen(false);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  {user.name}
                  {value === user.id && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
