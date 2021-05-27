import { NextPage } from "next";
import { Credentials, S3 } from "aws-sdk";
import Link from "next/link";

interface Props {
  region: string;
  bucket: string;
  prefix: string;
  prefixes: Array<{
    prefix: string;
    label: string;
  }>;
  contents: Array<{
    Key: string;
    label: string;
    LastModified: Date;
    Size: number;
  }>;
}

const Index: NextPage<Props> = ({
  region,
  bucket,
  prefix,
  prefixes,
  contents,
}) => (
  <>
    <h1>{prefix === "" ? "Root" : <>Prefix: {prefix}</>}</h1>
    <hr />
    <table>
      <thead>
        <tr>
          <th align="left">Name</th>
          <th align="right">Size</th>
        </tr>
      </thead>
      {prefix !== "" && (
        <tr>
          <td>
            <Link href="/..">..</Link>
          </td>
          <td align="right">-</td>
        </tr>
      )}
      {prefixes.map((e) => (
        <tr key={`prefix-${e}`}>
          <td>
            <Link href={`/${e.prefix}`}>{e.label}</Link>
          </td>
          <td align="right">-</td>
        </tr>
      ))}
      {contents.map((e) => (
        <tr key={`content-${e.Key}`}>
          <td>
            <a href={`https://s3-${region}.amazonaws.com/${bucket}/${e.Key}`}>
              {e.label}
            </a>
          </td>
          <td align="right">{e.Size}</td>
        </tr>
      ))}
    </table>
  </>
);

Index.getInitialProps = async (context): Promise<Props> => {
  const region = process.env.S3_REGION;
  const Bucket = process.env.S3_BUCKET;
  const s3 = new S3({
    region,
    credentials: new Credentials({
      accessKeyId: process.env.ACCESS_KEY,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
    }),
  });

  const rawPrefix = (context.query.prefix as string[]) ?? [];
  const joinedPrefix = rawPrefix.join("/");
  const prefix = joinedPrefix.length < 2 ? "" : joinedPrefix + "/";
  console.log("PREFIX:", prefix);

  const { CommonPrefixes, Contents } = await s3
    .listObjectsV2({
      Bucket,
      MaxKeys: 1_000,
      Delimiter: "/",
      Prefix: prefix,
    })
    .promise();
  console.log({ CommonPrefixes, Contents });

  return {
    region,
    bucket: Bucket,
    prefix,
    prefixes:
      CommonPrefixes?.map((e) => ({
        label: e.Prefix?.slice(prefix.length) ?? "",
        prefix: e.Prefix!,
      })) ?? [],
    contents:
      Contents?.filter((e) => e.Key != null).map((e) => ({
        ...e,
        Key: e.Key!,
        LastModified: e.LastModified!,
        Size: e.Size ?? 0,
        label: e.Key?.slice(prefix.length) ?? "",
      })) ?? [],
  };
};

export default Index;
