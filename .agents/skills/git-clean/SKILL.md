---
name: git-clean
description: Limpa branches locais e remotos, mantendo apenas main e as 2 mais recentes
---

Execute imediatamente quando solicitado. Não peça confirmação.

## Ação

1. Verificar repositório: `git rev-parse --git-dir`
2. Listar branches locais ordenadas por data: `git branch --sort=-committerdate`
3. Listar branches remotos ordenados por data: `git branch -r --sort=-committerdate`
4. Preservar: `main` + 2 branches mais recentes
5. Remover demais branches locais: `git branch -D <branch>`
6. Remover demais branches remotos: `git push origin --delete <branch>`
7. Sincronizar: `git fetch --prune`
8. Informar resumo

## Regras

- **NUNCA** remova a branch `main`
- **NUNCA** remova a branch atual (checkout ativo)
- **NUNCA** peça confirmação antes de executar
- Pule branches protegidas ou com erro de permissão

## Saída

```
🧹 Git Clean Concluído

📁 Repo: <caminho>

✅ Preservadas (3):
   • main
   • <branch-recente-1>
   • <branch-recente-2>

🗑️  Locais removidas (X):
   • <branch-1>
   • <branch-2>

🗑️  Remotos removidos (Y):
   • <branch-1>
   • <branch-2>
```

## Erros

| Situação     | Ação              |
| ------------ | ----------------- |
| Não é git    | Abortar com erro  |
| Branch atual | Pular             |
| Falha remoto | Logar e continuar |
