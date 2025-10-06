export const formatCEP = (value: string): string => {
  if (!value) return "";
  value = value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
  value = value.replace(/^(\d{5})(\d)/, '$1-$2'); // Adiciona o hífen após os primeiros 5 dígitos
  return value.slice(0, 9); // Garante que o comprimento não exceda o formato xxxxx-xxx
};

export const formatPhone = (value: string): string => {
  if (!value) return "";
  value = value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
  value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); // Adiciona parênteses ao redor do DDD
  value = value.replace(/(\d{5})(\d)/, '$1-$2'); // Adiciona o hífen após os primeiros 5 dígitos do número
  return value.slice(0, 15); // Garante que o comprimento não exceda o formato (xx) xxxxx-xxxx
};
