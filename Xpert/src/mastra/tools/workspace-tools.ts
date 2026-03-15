/**
 * Workspace Tools
 *
 * Este arquivo está vazio intencionalmente.
 *
 * Anteriormente continha wrappers para tools nativas do Mastra, mas
 * agora usamos apenas as funcionalidades nativas do framework.
 *
 * Quando um Agent tem um workspace configurado, o Mastra automaticamente
 * cria e disponibiliza as tools nativas:
 * - mastra_workspace_read_file
 * - mastra_workspace_write_file
 * - mastra_workspace_edit_file
 * - mastra_workspace_list_files
 * - mastra_workspace_delete
 * - mastra_workspace_file_stat
 * - mastra_workspace_mkdir
 * - mastra_workspace_grep
 *
 * Para usar funções do filesystem diretamente no código (não via LLM):
 *   workspace.filesystem.readdir(path)     // Lista diretório
 *   workspace.filesystem.readFile(path)    // Lê arquivo
 *   workspace.filesystem.writeFile(path, content) // Escreve arquivo
 *   workspace.filesystem.stat(path)        // Metadados
 */

// Exportações removidas - usar workspace.filesystem.* diretamente
// ou deixar o Mastra criar as tools automaticamente no Agent
