import { developer } from './developer';

function clean(value: string | undefined): string {
	return value?.trim() ?? '';
}

export const privacyContact = {
	controllerName: clean(import.meta.env.PUBLIC_PRIVACY_CONTROLLER_NAME) || 'UPPETITE Project',
	email: clean(import.meta.env.PUBLIC_PRIVACY_CONTACT_EMAIL) || developer.contacts.email.display,
} as const;
