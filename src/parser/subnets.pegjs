start
  = _ head:item tail:(_ "," _ item)* _ {
      return [head, ...tail.map(t => t[3])];
    }

item
  = base:( cidr / repeated / slashPrefixed / plain / cidr) label:(_ quotedText)? {
      if (label) {
        return {
          ...base,
          label: label[1]
        };
      }
      return base;
    }


repeated
  = value:prefix _ "*" _ times:positiveInteger {
      return {
        type: "prefix",
        value,
        times
      };
    }

slashPrefixed
  = "/" value:prefix {
      return {
        type: "prefix",
        value,
      };
    }

plain
  = value:prefix {
      return {
        type: "prefix",
        value,
      };
    }

cidr
  = oct1:octet "." oct2:octet "." oct3:octet "." oct4:octet "/" prfx:prefix {
      return {
        type: "cidr",
	value: `${oct1}.${oct2}.${oct3}.${oct4}/${prfx}`,
      }
    }

octet
  = digits:[0-9]+ {
      const raw = digits.join("");
      const value = Number(raw);

      // Validate octet range (0–255)
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error(`Invalid "${raw}". Must be an integer between 0 and 255.`);
      }

      return String(value);
    }


prefix
  = digits:[0-9]+ {
      const raw = digits.join("");
      const value = Number(raw);

      // Validate prefix range (0–32)
      if (!Number.isInteger(value) || value < 0 || value > 32) {
        throw new Error(`Invalid prefix "${raw}". Must be an integer between 0 and 32.`);
      }

      return String(value);
    }

positiveInteger
  = digits:[0-9]+ {
      const raw = digits.join("");
      const value = Number(raw);

      // Validate repetition count (> 0)
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid repetition value "${raw}". Must be an integer greater than 0.`);
      }

      return value;
    }

quotedText
  = doubleQuotedText
  / singleQuotedText

doubleQuotedText
  = "\"" chars:doubleQuotedChar* "\"" {
      return chars.join("");
    }

singleQuotedText
  = "'" chars:singleQuotedChar* "'" {
      return chars.join("");
    }

doubleQuotedChar
  = "\\\"" { return "\""; }
  / "\\\\" { return "\\"; }
  / [^"\\]

singleQuotedChar
  = "\\'" { return "'"; }
  / "\\\\" { return "\\"; }
  / [^'\\]

_
  = [ \t\n\r]*
