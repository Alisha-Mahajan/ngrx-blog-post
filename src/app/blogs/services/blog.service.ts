import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CreateQueryParams, RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { CrudListResponse, uuid } from '../../core/types';
import { Image, Post } from '../models';

@Injectable()
export class BlogService {
  constructor(
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer
  ) {}

  getAllPost(query: CreateQueryParams = {}) {
    const queryObj = { ...this._getBlogQueryObj(), ...query };
    const qb = RequestQueryBuilder.create(queryObj).query();
    return this.http
      .get<CrudListResponse<Post>>(`${environment.apiUrl}/posts`, {
        params: new HttpParams({ fromString: qb }),
      })
      .pipe(
        map((payload) => {
          return {
            ...payload,
            data: payload.data.map((item) => new Post(item)),
          };
        })
      );
  }

  getPostById(id: uuid, query: CreateQueryParams = {}) {
    const qb = RequestQueryBuilder.create(query).query();
    return this.http
      .get<Post>(`${environment.apiUrl}/posts/${id}`, {
        params: new HttpParams({ fromString: qb }),
      })
      .pipe(map((payload) => new Post(payload)));
  }

  createPost(payload: FormData, query: CreateQueryParams = {}) {
    const queryObj = { ...this._getBlogQueryObj(), ...query };
    const qb = RequestQueryBuilder.create(queryObj).query();
    return this.http.post<Post>(`${environment.apiUrl}/posts`, payload, {
      params: new HttpParams({ fromString: qb }),
    });
  }

  updatePost(id: uuid, payload: FormData, query: CreateQueryParams = {}) {
    const queryObj = { join: [{ field: 'image' }], ...query };
    const qb = RequestQueryBuilder.create(queryObj).query();
    return this.http.patch<Partial<Post>>(
      `${environment.apiUrl}/posts/${id}`,
      payload,
      { params: new HttpParams({ fromString: qb }) }
    );
  }

  deletePost(id: uuid) {
    return this.http.delete(`${environment.apiUrl}/posts/${id}`);
  }

  appendBase64Url(post: Post): Observable<Post> {
    return new Observable((subscriber) => {
      const base64 = post.image?.base64;
      if (base64) {
        subscriber.next({
          ...post,
          image: new Image(post.image),
        });
      } else {
        subscriber.next(post);
      }
      subscriber.complete();
    });
  }

  // Private functions
  private _getBlogQueryObj(): CreateQueryParams {
    return {
      join: [
        { field: 'author' },
        { field: 'image' },
        { field: 'comments', select: ['id'] },
        { field: 'author.avatar' },
      ],
    };
  }

  /**
   * Converts ArrayBuffer to Base64 SafeURL
   * @param imgBuffer ArrayBuffer
   * @param contentType
   * @returns Base64 SafeUrl
   * @url https://medium.com/@koteswar.meesala/convert-array-buffer-to-base64-string-to-display-images-in-angular-7-4c443db242cd
   */
  private _convertToBase64Url(imgBuffer: ArrayBuffer, contentType: string) {
    const arr = new Uint8Array(imgBuffer);
    const strChar = arr.reduce((acc, byte) => {
      return acc + String.fromCharCode(byte);
    }, '');
    const base64 = btoa(strChar);
    const base64Url = this.sanitizer.bypassSecurityTrustUrl(
      `url(data:${contentType};base64,${base64})`
    );
    return (base64Url as any).changingThisBreaksApplicationSecurity;
  }
}
