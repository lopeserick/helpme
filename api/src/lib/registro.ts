import type { FastifyRequest } from 'fastify';
import { lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { acessoPainel } from '../db/schema.js';

/**
 * Registro de acessos ao painel. Fica 180 dias e depois é apagado sozinho
 * (de vez em quando, ao gravar um novo).
 */
export type Evento =
  | 'login'
  | 'senha_errada'
  | 'conta_bloqueada'
  | 'codigo_errado'
  | 'logout'
  | 'cadastro'
  | 'senha_alterada'
  | '2fa_ativada'
  | '2fa_desativada';

const RETENCAO_DIAS = 180;

export async function registrarAcesso(
  requisicao: FastifyRequest,
  evento: Evento,
  quem: { usuarioId?: number | null; email?: string | null },
) {
  try {
    await db.insert(acessoPainel).values({
      usuarioId: quem.usuarioId ?? null,
      email: quem.email ?? null,
      evento,
      ip: requisicao.ip,
      navegador: String(requisicao.headers['user-agent'] ?? '').slice(0, 300) || null,
    });

    if (Math.random() < 0.02) {
      const limite = new Date(Date.now() - RETENCAO_DIAS * 24 * 60 * 60 * 1000);
      await db.delete(acessoPainel).where(lt(acessoPainel.em, limite));
    }
  } catch (erro) {
    // Falha no registro não pode impedir o login: anota no log e segue.
    requisicao.log.error(erro, 'falha ao registrar acesso ao painel');
  }
}
