import { formatToTimeZone } from 'date-fns-timezone';

async function GetDate(): Promise<string> {
    const date = new Date();
    const format = 'YYYY-MM-DD';
    const output = formatToTimeZone(date, format, { timeZone: 'America/Sao_Paulo' });

    return output;
}

export default GetDate;
