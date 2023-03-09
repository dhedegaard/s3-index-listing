import { Credentials, S3 } from "aws-sdk";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HTMLProps, memo, use } from "react";

const NameTd = memo(function NameTd(props: HTMLProps<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      className="overflow-hidden overflow-ellipsis w-[200px] max-w-[200px] text-left"
    />
  );
});

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
    LastModified: string;
    Size: number;
  }>;
}

export default function Index({
  params,
}: {
  params: { prefix: undefined | string[] };
}) {
  const data = use(getBucketContent(params.prefix?.join("/") ?? "/"));
  if (!data) {
    notFound();
  }
  const { region, bucket, prefix, prefixes, contents } = data;

  return (
    <main className="mx-auto max-w-5xl px-2">
      <h1>{prefix === "" ? "Root" : <>Prefix: {prefix}</>}</h1>
      <hr />
      <table cellSpacing="5">
        <thead>
          <tr>
            <NameTd>Name</NameTd>
            <th align="left">Last modified</th>
            <th align="right">Size</th>
          </tr>
        </thead>
        <tbody>
          {prefix !== "" && (
            <tr>
              <NameTd>
                <Link href="/..">..</Link>
              </NameTd>
              <td></td>
              <td align="right"></td>
            </tr>
          )}
          {prefixes.map((e) => (
            <tr key={`prefix-${e.prefix}`}>
              <NameTd>
                <Link href={`/${e.prefix}`}>{e.label}</Link>
              </NameTd>
              <td></td>
              <td align="right"></td>
            </tr>
          ))}
          {contents.map((e) => (
            <tr key={`content-${e.Key}`}>
              <NameTd>
                <a
                  href={`https://s3-${region}.amazonaws.com/${bucket}/${e.Key}`}
                >
                  {e.label}
                </a>
              </NameTd>
              <td>{new Date(e.LastModified).toLocaleString()}</td>
              <td align="right">{e.Size.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const getBucketContent = async (
  pathname: string
): Promise<Props | undefined> => {
  const region = process.env.S3_REGION!;
  const Bucket = process.env.S3_BUCKET!;
  const s3 = new S3({
    region,
    credentials: new Credentials({
      accessKeyId: process.env.ACCESS_KEY!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    }),
  });

  const prefix = pathname.length < 2 ? "" : pathname + "/";

  const { CommonPrefixes, Contents } = await s3
    .listObjectsV2({
      Bucket,
      MaxKeys: 1_000,
      Delimiter: "/",
      Prefix: prefix,
    })
    .promise();

  if (
    (CommonPrefixes == null || CommonPrefixes.length === 0) &&
    (Contents == null || Contents.length === 0)
  ) {
    return undefined;
  }

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
        LastModified: e.LastModified!.toISOString(),
        Size: e.Size ?? 0,
        label: e.Key?.slice(prefix.length) ?? "",
      })) ?? [],
  };
};
