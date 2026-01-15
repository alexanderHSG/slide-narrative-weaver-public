import { callShortTitle } from '../api/apiClient'

export const generateShortTitleFromDescription = async (
  description: string
): Promise<string> => {
  try {
    const title: string = await callShortTitle(description)
    return title
  } catch (error: any) {
    console.error('Error generating short title:', error)
    return description ? description.slice(0, 32) : 'Untitled'
  }
}
