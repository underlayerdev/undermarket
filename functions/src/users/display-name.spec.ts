import { describe, expect, it } from 'vitest';
import { getDisplayNameFormatError, normalizeDisplayName } from './display-name';

const DISPLAY_NAME_MAX_LENGTH = 50;

function errorFor(value: string) {
  return getDisplayNameFormatError(normalizeDisplayName(value));
}

describe('normalizeDisplayName', () => {
  it('should trim and collapse runs of whitespace into one space', () => {
    expect(normalizeDisplayName('  Jane \t  Doe  ')).toBe('Jane Doe');
  });

  it('should treat non-breaking and ideographic spaces as spaces', () => {
    expect(normalizeDisplayName('Jane Doe　Smith')).toBe('Jane Doe Smith');
  });

  it('should fold fancy and fullwidth letters into plain ones', () => {
    expect(normalizeDisplayName('𝓛𝓾𝓬𝓪𝓼')).toBe('Lucas');
    expect(normalizeDisplayName('Ｊａｎｅ')).toBe('Jane');
  });

  it('should compose a decomposed accent into one character', () => {
    expect(normalizeDisplayName('José')).toBe('José');
  });

  it('should leave the casing alone', () => {
    expect(normalizeDisplayName('McNamara van der Berg')).toBe('McNamara van der Berg');
  });
});

describe('getDisplayNameFormatError', () => {
  describe('names it accepts', () => {
    it.each([
      'Jane Doe',
      'Zoë',
      'Łukasz Nowak',
      'José María',
      'Müller',
      "Siobhán O'Brien",
      'D’Angelo',
      'Mary-Jane Watson',
      'McNamara',
      'J.R. Smith',
      'Smith Jr.',
      'Nguyễn Văn A',
      'Иван Петров',
      'محمد علي',
      '李小龍',
      '山田 太郎',
      'Retro Shop 24',
      // Different alphabets in different words is normal for bilingual people.
      'Anna Иванова',
    ])('should accept %s', (name) => {
      expect(errorFor(name)).toBeNull();
    });

    it('should accept the exact minimum and maximum lengths', () => {
      expect(errorFor('Jo')).toBeNull();
      expect(errorFor('ab'.repeat(DISPLAY_NAME_MAX_LENGTH / 2))).toBeNull();
    });
  });

  describe('length', () => {
    it('should require a value', () => {
      expect(errorFor('   ')).toBe('required');
    });

    it('should reject a single character', () => {
      expect(errorFor('J')).toBe('tooShort');
    });

    it('should reject a name over the maximum length', () => {
      expect(errorFor('ab'.repeat(DISPLAY_NAME_MAX_LENGTH / 2 + 1))).toBe('tooLong');
    });
  });

  describe('characters', () => {
    it.each(['Jane 😀', 'Jane_Doe', 'Jane@Doe', '<b>Jane</b>', 'Jane/Doe', 'Jane & Co', 'Jane©'])(
      'should reject %s',
      (name) => {
        expect(errorFor(name)).toBe('invalidCharacters');
      },
    );

    it('should reject invisible characters instead of silently keeping them', () => {
      expect(errorFor('Ja​ne')).toBe('invalidCharacters');
      expect(errorFor('Jane‮Doe')).toBe('invalidCharacters');
      expect(errorFor('Ja\u0000ne')).toBe('invalidCharacters');
    });

    it('should require at least one letter', () => {
      expect(errorFor('12345')).toBe('noLetters');
      expect(errorFor('1 2')).toBe('noLetters');
    });
  });

  describe('punctuation', () => {
    it.each(['-Jane', '.Jane', "'Jane", 'Jane-', "Jane'", 'Jane--Doe', "Jane'-Doe", 'Jane..Doe'])(
      'should reject %s',
      (name) => {
        expect(errorFor(name)).toBe('badPunctuation');
      },
    );
  });

  describe('repeated characters', () => {
    it('should reject a character repeated more than three times in a row', () => {
      expect(errorFor('Jaaaane')).toBe('repeatedCharacters');
      expect(errorFor('Jane 0000')).toBe('repeatedCharacters');
    });

    it('should allow up to three in a row', () => {
      expect(errorFor('Jaaane')).toBeNull();
    });
  });

  describe('look-alike alphabets', () => {
    it('should reject a word that mixes Latin with Cyrillic or Greek', () => {
      // The "а" below is Cyrillic.
      expect(errorFor('pаypal')).toBe('mixedScripts');
      // The "ο" below is Greek.
      expect(errorFor('Jοhn')).toBe('mixedScripts');
    });
  });

  describe('contact details', () => {
    it.each(['mary.smith', 'shop.com', 'St.John'])('should reject %s as a web address', (name) => {
      expect(errorFor(name)).toBe('looksLikeLink');
    });

    it('should reject a phone number but allow a few digits', () => {
      expect(errorFor('Maria 600 123 456')).toBe('tooManyDigits');
      expect(errorFor('Shop 12345')).toBeNull();
      expect(errorFor('Shop 123456')).toBe('tooManyDigits');
    });
  });

  describe('reserved names', () => {
    it.each(['Admin', 'SUPPORT', 'a.d.m.i.n', 'Staff', 'Moderator'])('should reject %s', (name) => {
      expect(errorFor(name)).toBe('reserved');
    });

    it('should reject the brand anywhere in the name, however it is spaced', () => {
      expect(errorFor('Undermarket Support')).toBe('reserved');
      expect(errorFor('Under Market')).toBe('reserved');
      expect(errorFor('Mr Under-layer')).toBe('reserved');
    });

    it('should allow a real name that merely contains a reserved word', () => {
      expect(errorFor('Helpful Henry')).toBeNull();
      expect(errorFor('Team Rocket')).toBeNull();
    });
  });
});
