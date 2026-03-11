---
name: git-commit
description: Executa git commit automaticamente com mensagem baseada no contexto
---

Execute imediatamente o commit quando solicitado. Não peça confirmação.

## Ação

1. `git add .`
2. Gere mensagem no formato: `<tipo>: <descrição>`
3. `git commit -m "<mensagem>"`
4. Se falhar pelo Husky, corrija e repita
5. Informe: `✅ Commit: <hash> - <mensagem>`

## Tipos de Commit

| Tipo       | Uso                 |
| ---------- | ------------------- |
| `feat`     | Nova funcionalidade |
| `fix`      | Correção de bug     |
| `refactor` | Refatoração         |
| `docs`     | Documentação        |
| `style`    | Formatação          |
| `test`     | Testes              |
| `chore`    | Manutenção          |

## Exemplos

- `feat: adiciona validação de CPF`
- `fix: corrige autenticação no login`
- `refactor: simplifica componente Button`

## Regras

- **NUNCA** peça confirmação antes de executar
- **NUNCA** explique o que vai fazer antes de fazer
- **SEMPRE** execute direto quando solicitado via `/skill:git-commit` ou "faça commit"
- Mensagem em português (conforme padrão do projeto)
