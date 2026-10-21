import { createContext, useContext } from 'react';
import type { Usuario } from '../api/admin';

export interface AuthContextValue {
  usuario: Usuario | null;
  /** Verdadeiro enquanto o site confere se já existe uma sessão aberta. */
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: {
    nome: string;
    email: string;
    senha: string;
    codigo: string;
  }) => Promise<void>;
  sair: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return contexto;
}
