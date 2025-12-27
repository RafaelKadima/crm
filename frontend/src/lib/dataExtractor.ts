/**
 * Utilitário para extrair dados estruturados de mensagens de texto
 * Detecta: Email, Telefone, CPF, CEP, Data de Nascimento
 */

export interface ExtractedData {
  type: 'email' | 'phone' | 'cpf' | 'cep' | 'birth_date'
  value: string
  formatted: string
  label: string
  fieldName: string // Nome do campo para salvar no lead
}

// Regex patterns para cada tipo de dado
const patterns = {
  // Email - padrão comum
  email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi,

  // Telefone BR - (11) 99999-9999, 11999999999, +55 11 99999-9999, etc
  phone: /(?:\+55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}\b/g,

  // CPF - 123.456.789-00 ou 12345678900
  cpf: /\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b/g,

  // CEP - 12345-678 ou 12345678
  cep: /\b\d{5}[-.]?\d{3}\b/g,

  // Data de nascimento - DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA
  birth_date: /\b(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](19|20)\d{2}\b/g,
}

// Labels para exibição
const labels: Record<ExtractedData['type'], string> = {
  email: 'Email',
  phone: 'Telefone',
  cpf: 'CPF',
  cep: 'CEP',
  birth_date: 'Data de Nascimento',
}

// Nomes dos campos no lead/contact
const fieldNames: Record<ExtractedData['type'], string> = {
  email: 'email',
  phone: 'phone',
  cpf: 'cpf',
  cep: 'cep',
  birth_date: 'birth_date',
}

/**
 * Formata o valor extraído para exibição
 */
function formatValue(type: ExtractedData['type'], value: string): string {
  switch (type) {
    case 'phone': {
      // Remove tudo que não é número
      const numbers = value.replace(/\D/g, '')
      // Remove 55 do início se tiver
      const phone = numbers.startsWith('55') && numbers.length > 11
        ? numbers.slice(2)
        : numbers
      // Formata (XX) XXXXX-XXXX
      if (phone.length === 11) {
        return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
      }
      if (phone.length === 10) {
        return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`
      }
      return phone
    }
    case 'cpf': {
      const numbers = value.replace(/\D/g, '')
      if (numbers.length === 11) {
        return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
      }
      return numbers
    }
    case 'cep': {
      const numbers = value.replace(/\D/g, '')
      if (numbers.length === 8) {
        return `${numbers.slice(0, 5)}-${numbers.slice(5)}`
      }
      return numbers
    }
    case 'birth_date': {
      // Normaliza para DD/MM/AAAA
      const parts = value.split(/[\/\-\.]/)
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0')
        const month = parts[1].padStart(2, '0')
        const year = parts[2]
        return `${day}/${month}/${year}`
      }
      return value
    }
    default:
      return value
  }
}

/**
 * Valida se o valor extraído é válido
 */
function isValidValue(type: ExtractedData['type'], value: string): boolean {
  switch (type) {
    case 'cpf': {
      const numbers = value.replace(/\D/g, '')
      if (numbers.length !== 11) return false
      // Verifica se todos os dígitos são iguais
      if (/^(\d)\1{10}$/.test(numbers)) return false
      // Validação básica do CPF
      let sum = 0
      for (let i = 0; i < 9; i++) {
        sum += parseInt(numbers[i]) * (10 - i)
      }
      let digit = (sum * 10) % 11
      if (digit === 10) digit = 0
      if (digit !== parseInt(numbers[9])) return false
      sum = 0
      for (let i = 0; i < 10; i++) {
        sum += parseInt(numbers[i]) * (11 - i)
      }
      digit = (sum * 10) % 11
      if (digit === 10) digit = 0
      return digit === parseInt(numbers[10])
    }
    case 'phone': {
      const numbers = value.replace(/\D/g, '')
      // Remove 55 do início se tiver
      const phone = numbers.startsWith('55') && numbers.length > 11
        ? numbers.slice(2)
        : numbers
      // Deve ter 10 ou 11 dígitos
      return phone.length >= 10 && phone.length <= 11
    }
    case 'cep': {
      const numbers = value.replace(/\D/g, '')
      return numbers.length === 8
    }
    case 'birth_date': {
      const parts = value.split(/[\/\-\.]/)
      if (parts.length !== 3) return false
      const day = parseInt(parts[0])
      const month = parseInt(parts[1])
      const year = parseInt(parts[2])
      if (day < 1 || day > 31) return false
      if (month < 1 || month > 12) return false
      if (year < 1900 || year > new Date().getFullYear()) return false
      return true
    }
    case 'email': {
      // Validação básica de email
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    }
    default:
      return true
  }
}

/**
 * Extrai todos os dados identificáveis de uma string de texto
 */
export function extractDataFromText(text: string): ExtractedData[] {
  const results: ExtractedData[] = []
  const seen = new Set<string>() // Para evitar duplicatas

  // Itera sobre cada tipo de pattern
  for (const [type, pattern] of Object.entries(patterns)) {
    const matches = text.matchAll(pattern as RegExp)

    for (const match of matches) {
      const value = match[0]
      const dataType = type as ExtractedData['type']

      // Verifica se é válido e não é duplicata
      if (isValidValue(dataType, value) && !seen.has(value.toLowerCase())) {
        seen.add(value.toLowerCase())

        results.push({
          type: dataType,
          value: value,
          formatted: formatValue(dataType, value),
          label: labels[dataType],
          fieldName: fieldNames[dataType],
        })
      }
    }
  }

  return results
}

/**
 * Retorna o valor limpo para salvar no banco (apenas números para CPF, CEP, telefone)
 */
export function getCleanValue(type: ExtractedData['type'], value: string): string {
  switch (type) {
    case 'phone':
    case 'cpf':
    case 'cep':
      // Remove tudo que não é número
      const numbers = value.replace(/\D/g, '')
      // Para telefone, remove o 55 do início se tiver mais de 11 dígitos
      if (type === 'phone' && numbers.startsWith('55') && numbers.length > 11) {
        return numbers.slice(2)
      }
      return numbers
    case 'birth_date':
      // Converte para formato ISO (YYYY-MM-DD)
      const parts = value.split(/[\/\-\.]/)
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0')
        const month = parts[1].padStart(2, '0')
        const year = parts[2]
        return `${year}-${month}-${day}`
      }
      return value
    default:
      return value
  }
}
